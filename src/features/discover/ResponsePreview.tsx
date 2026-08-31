import { ArrowUpRight } from 'lucide-react'
import { Reactions } from '../responses/Reactions.tsx'

interface ResponsePreviewProps {
  author: string
  initials: string
  copy: string
  image: string
  imageAlt: string
  reactions: number
  onOpen: () => void
}

export function ResponsePreview({ author, initials, copy, image, imageAlt, reactions, onOpen }: ResponsePreviewProps) {
  return (
    <article className="feed-response-preview">
      <div className="response-quote-line"><span aria-hidden="true" /><small>{author} joined with their version</small></div>
      <div className="feed-response-preview__body">
        <span className="avatar avatar--response">{initials}</span>
        <div className="feed-response-preview__copy"><strong>{author}</strong><p>{copy}</p><Reactions initialCount={reactions} compact /></div>
        <button className="response-thumbnail" type="button" aria-label={`Open ${author}'s response`} onClick={onOpen}>
          <img src={image} alt={imageAlt} width="120" height="120" />
          <ArrowUpRight aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
