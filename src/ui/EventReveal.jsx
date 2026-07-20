import { useGame } from '../game/store'
import { EVENTS, eventArt } from '../data/events'
import ModalShell from './ModalShell'

export default function EventReveal() {
  const show = useGame((s) => s.eventReveal)
  const eventId = useGame((s) => s.eventId)
  const round = useGame((s) => s.round)
  const handoffPending = useGame((s) => s.handoffPending)
  const dismiss = useGame((s) => s.dismissEventReveal)
  if (!show || !eventId || handoffPending) return null
  const ev = EVENTS[eventId]
  return (
    <ModalShell className="event-modal" ariaLabel={`Round ${round}: ${ev.name}`} onClose={dismiss} closeOnBackdrop>
        <div className="event-round">Round {round}</div>
        <img className="event-art" src={eventArt(ev.id)} alt={ev.name} />
        <h2 className="event-name">{ev.name}</h2>
        <p className="event-desc">{ev.desc}</p>
        <button className="btn-primary" onClick={dismiss}>Begin Round</button>
    </ModalShell>
  )
}
