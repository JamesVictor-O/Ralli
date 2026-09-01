import { useState } from 'react'
import { HandCoins, MoreHorizontal, Repeat2, Share2 } from 'lucide-react'
import { Reactions } from './Reactions.tsx'
import { PassItOn } from '../chains/PassItOn.tsx'
import { Tip } from '../rewards/Tip.tsx'

const responses = [
  {
    id: 'victor', author: 'Victor K.', initials: 'VK', location: 'Lagos', time: '4m',
    copy: 'A tiny ceramic frog holding my emergency paper clips. His name is Gerald.',
    image: 'https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&w=900&q=85',
    imageAlt: 'Colourful objects arranged on a creative desk', reactions: 86, tips: 8.5, tone: 'lime',
  },
  {
    id: 'sarah', author: 'Sarah A.', initials: 'SA', location: 'London', time: '11m',
    copy: 'This rubber duck has attended every meeting with me for three years. Management has not noticed.',
    image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=85',
    imageAlt: 'A bright home workspace with objects on the desk', reactions: 64, tips: 4, tone: 'violet',
  },
  {
    id: 'james', author: 'James D.', initials: 'JD', location: 'Accra', time: '19m',
    copy: 'No photo needed: it is a single googly eye stuck to my monitor. It watches the bugs before I do.',
    image: null, imageAlt: '', reactions: 42, tips: 2.5, tone: 'coral',
  },
]

type Sort = 'Popular' | 'Newest'

export function ResponseViewer() {
  const [sort, setSort] = useState<Sort>('Popular')
  const [passAuthor, setPassAuthor] = useState<string | null>(null)
  const [tipAuthor, setTipAuthor] = useState<string | null>(null)
  const orderedResponses = sort === 'Popular' ? responses : [...responses].reverse()

  return (
    <section className="response-stream" aria-labelledby="responses-heading">
      <header className="response-stream__header">
        <div><p className="eyebrow">84 people tried it</p><h2 id="responses-heading">See how everyone did it</h2></div>
        <div className="response-sort" role="group" aria-label="Sort responses">
          {(['Popular', 'Newest'] as Sort[]).map((item) => (
            <button className={sort === item ? 'is-active' : ''} type="button" aria-pressed={sort === item}
              key={item} onClick={() => setSort(item)}>{item}</button>
          ))}
        </div>
      </header>

      <div className="response-list">
        {orderedResponses.map((response) => (
          <article className="response-post" key={response.id}>
            <header>
              <span className={`avatar avatar--response avatar--${response.tone}`}>{response.initials}</span>
              <div><strong>{response.author}</strong><small>{response.location} · {response.time} ago</small></div>
              <button className="response-more" type="button" aria-label={`More options for ${response.author}'s response`}><MoreHorizontal aria-hidden="true" /></button>
            </header>
            {response.image ? <><p className="response-post__copy">{response.copy}</p><img className="response-post__image" src={response.image} alt={response.imageAlt} width="720" height="520" /></> : (
              <div className="text-response"><span>“</span><p>{response.copy}</p></div>
            )}
            <footer>
              <Reactions initialCount={response.reactions} />
              <button className="tip-response" type="button" onClick={() => setTipAuthor(response.author)}><HandCoins aria-hidden="true" /><span>Tip</span><strong>{response.tips} NIM</strong></button>
              <button type="button" onClick={() => setPassAuthor(response.author)}><Repeat2 aria-hidden="true" /><span>Pass it on</span></button>
              <button type="button" aria-label="Share response"><Share2 aria-hidden="true" /></button>
            </footer>
          </article>
        ))}
      </div>
      {passAuthor && <PassItOn responseAuthor={passAuthor} onClose={() => setPassAuthor(null)} />}
      {tipAuthor && <Tip author={tipAuthor} onClose={() => setTipAuthor(null)} />}
    </section>
  )
}
