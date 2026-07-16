import { useGame } from '../game/store'
import { EVENTS, eventArt } from '../data/events'

export default function EventReveal() {
  const show = useGame((s) => s.eventReveal)
  const eventId = useGame((s) => s.eventId)
  const round = useGame((s) => s.round)
  const dismiss = useGame((s) => s.dismissEventReveal)
  if (!show || !eventId) return null
  const ev = EVENTS[eventId]
  return (
    <div className="overlay" onClick={dismiss}>
      <div className="modal event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-round">Round {round}</div>
        <img className="event-art" src={eventArt(ev.id)} alt={ev.name} />
        <h2 className="event-name">{ev.name}</h2>
        <p className="event-desc">{ev.desc}</p>
        <button className="btn-primary" onClick={dismiss}>Begin Round</button>
      </div>
    </div>
  )
}
