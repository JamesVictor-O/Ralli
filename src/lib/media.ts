import { requireSupabase } from './supabase.ts'
import { withNetworkRetry } from './retry.ts'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const videoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/hevc'])
const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp'])
const videoExtensions = new Set(['mp4', 'webm', 'mov', 'm4v'])
const COVER_MAX_DIMENSION = 1600
const COVER_WEBP_QUALITY = 0.82
const RESPONSE_MAX_DIMENSION = 1440
const RESPONSE_WEBP_QUALITY = 0.8
const AVATAR_DIMENSION = 512
const AVATAR_WEBP_QUALITY = 0.85
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const avatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

function fileExtension(file: File) {
  return file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? ''
}

export function isImageFile(file: File) {
  const extension = fileExtension(file)
  return extension ? imageExtensions.has(extension) : imageTypes.has(file.type.toLowerCase())
}

export function isVideoFile(file: File) {
  const extension = fileExtension(file)
  return extension ? videoExtensions.has(extension) : videoTypes.has(file.type.toLowerCase())
}

function uploadContentType(file: File) {
  const extension = fileExtension(file)
  if (extension === 'mov') return 'video/quicktime'
  if (extension === 'm4v') return 'video/x-m4v'
  if (extension === 'mp4') return 'video/mp4'
  if (extension === 'webm') return 'video/webm'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (file.type) return file.type.toLowerCase()
  return 'image/jpeg'
}

export function validateMedia(file: File, kind: 'cover' | 'response') {
  const image = isImageFile(file)
  const video = isVideoFile(file)
  if (!image && !video) throw new Error('Choose a JPG, PNG, WebP, MP4, MOV, M4V, or WebM file.')
  const limit = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > limit) throw new Error(`That ${video ? 'video' : 'image'} is too large. ${video ? 'Choose one under 50 MB.' : 'Choose one under 10 MB.'}`)
  if (kind === 'cover' && video) throw new Error('Ralli covers currently support photos only.')
}

export async function optimizeCoverImage(file: File) {
  validateMedia(file, 'cover')
  if (file.type === 'image/webp' && file.size <= 1_500_000) return file

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, COVER_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', COVER_WEBP_QUALITY))
    if (!blob || blob.size >= file.size) return file
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'ralli-cover'
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}

export async function optimizeResponseImage(file: File) {
  validateMedia(file, 'response')
  if (!isImageFile(file)) return file
  if (file.type === 'image/webp' && file.size <= 1_250_000) return file

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, RESPONSE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', RESPONSE_WEBP_QUALITY))
    if (!blob || blob.size >= file.size) return file
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'ralli-response'
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}

function validateAvatar(file: File) {
  if (!avatarTypes.has(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.')
  if (file.size > MAX_AVATAR_BYTES) throw new Error('That image is too large.')
}

// Center-crops to a square so every avatar renders consistently in the app's
// circular avatar slots, regardless of the aspect ratio someone uploads.
export async function optimizeAvatarImage(file: File) {
  validateAvatar(file)
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const sourceX = (bitmap.width - side) / 2
    const sourceY = (bitmap.height - side) / 2
    const outputSide = Math.min(AVATAR_DIMENSION, side)
    const canvas = document.createElement('canvas')
    canvas.width = outputSide
    canvas.height = outputSide
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, outputSide, outputSide)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', AVATAR_WEBP_QUALITY))
    if (!blob) return file
    return new File([blob], 'avatar.webp', { type: 'image/webp', lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}

export async function uploadAvatar(userId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp'
  const path = `${userId}/avatar.${extension}`
  const { error } = await withNetworkRetry(() => requireSupabase().storage.from('avatars').upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: true,
  }))
  if (error) throw error
  // Bust the CDN/browser cache for this fixed path so a re-upload shows immediately.
  return `${path}?v=${Date.now()}`
}

export function publicAvatarUrl(path: string | null) {
  if (!path) return null
  const [storagePath, query] = path.split('?')
  const { data } = requireSupabase().storage.from('avatars').getPublicUrl(storagePath)
  return query ? `${data.publicUrl}?${query}` : data.publicUrl
}

export function createId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function resumableStorageEndpoint() {
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  if (!configuredUrl) throw new Error('Supabase is not configured.')
  const url = new URL(configuredUrl)
  const projectRef = url.hostname.endsWith('.supabase.co') ? url.hostname.split('.')[0] : null
  return projectRef
    ? `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`
    : `${url.origin}/storage/v1/upload/resumable`
}

async function uploadVideoResumably(path: string, file: File, onProgress?: (percentage: number) => void) {
  const database = requireSupabase()
  // Keep the TUS client out of the initial social feed bundle; it is only needed
  // after somebody explicitly posts a large video.
  const { Upload } = await import('tus-js-client')
  const { data: { session }, error } = await database.auth.getSession()
  if (error) throw error
  if (!session) throw new Error('Your Ralli session expired. Reopen the app and try again.')

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: resumableStorageEndpoint(),
      retryDelays: [0, 1_000, 3_000, 5_000, 10_000],
      headers: { authorization: `Bearer ${session.access_token}`, 'x-upsert': 'true' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: 'ralli-media',
        objectName: path,
        contentType: uploadContentType(file),
        cacheControl: '31536000',
      },
      onError: reject,
      onProgress: (uploaded, total) => onProgress?.(Math.min(100, Math.round((uploaded / total) * 100))),
      onSuccess: () => resolve(),
    })
    void upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0])
      upload.start()
    }).catch(reject)
  })
}

export async function uploadRalliMedia(userId: string, folder: 'covers' | 'responses', file: File, onProgress?: (percentage: number) => void) {
  validateMedia(file, folder === 'covers' ? 'cover' : 'response')
  const extension = fileExtension(file) || (isVideoFile(file) ? 'mp4' : 'jpg')
  const path = `${userId}/${folder}/${createId()}.${extension}`
  if (isVideoFile(file) && file.size > 6 * 1024 * 1024) {
    await uploadVideoResumably(path, file, onProgress)
    return path
  }
  const { error } = await withNetworkRetry(() => requireSupabase().storage.from('ralli-media').upload(path, file, {
    contentType: uploadContentType(file),
    cacheControl: '31536000',
    upsert: true,
  }))
  if (error) throw error
  onProgress?.(100)
  return path
}

export function publicMediaUrl(path: string | null) {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return requireSupabase().storage.from('ralli-media').getPublicUrl(path).data.publicUrl
}
