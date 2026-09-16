import { FeedVideo } from './FeedVideo.tsx'

export function RalliCover({
  src,
  alt,
  type,
  interactive = false,
  eager = false,
  decorative = false,
}: {
  src: string
  alt: string
  type: 'image' | 'video'
  interactive?: boolean
  eager?: boolean
  decorative?: boolean
}) {
  if (type === 'video') {
    if (interactive) return <FeedVideo src={src} compact />
    return (
      <video
        src={src}
        muted
        playsInline
        loop
        autoPlay
        preload={eager ? 'auto' : 'metadata'}
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : alt}
      />
    )
  }

  return <img src={src} alt={decorative ? '' : alt} width="720" height="520" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" />
}
