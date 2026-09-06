import { requireSupabase } from './supabase.ts'
import { withNetworkRetry } from './retry.ts'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
const COVER_MAX_DIMENSION = 1600
const COVER_WEBP_QUALITY = 0.82

export function validateMedia(file: File, kind: 'cover' | 'response') {
  if (!allowedTypes.has(file.type)) throw new Error('Choose a JPG, PNG, WebP, MP4, or WebM file.')
  const limit = file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > limit) throw new Error(`That ${file.type.startsWith('video/') ? 'video' : 'image'} is too large.`)
  if (kind === 'cover' && file.type.startsWith('video/')) throw new Error('Ralli covers currently support photos only.')
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

export function createId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function uploadRalliMedia(userId: string, folder: 'covers' | 'responses', file: File) {
  validateMedia(file, folder === 'covers' ? 'cover' : 'response')
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (file.type.startsWith('video/') ? 'mp4' : 'jpg')
  const path = `${userId}/${folder}/${createId()}.${extension}`
  const { error } = await withNetworkRetry(() => requireSupabase().storage.from('ralli-media').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: true,
  }))
  if (error) throw error
  return path
}

export function publicMediaUrl(path: string | null) {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return requireSupabase().storage.from('ralli-media').getPublicUrl(path).data.publicUrl
}
