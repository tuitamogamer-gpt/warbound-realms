import { useRef, useState } from 'react'
import { useGame, selCurrentPlayer, selEventMod } from '../game/store'
import { ITEM_LIST, ITEMS, itemArt } from '../data/items'
import { trainableForHero, abilityArt, maxAbilitySlots } from '../data/abilities'
import { GAME } from '../data/constants'
import { sfx } from '../game/sfx'
import ModalShell from './ModalShell'

function ItemsTab({ player, discount, buyItem, filter, affordableOnly, isPurchasing }) {
  const owned = (item) =>
    item.slot !== 'consumable' && player.items.includes(item.id)
  const consumablesFull = player.consumables.length >= GAME.MAX_CONSUMABLES

  return (
    <div className="shop-grid">
      {ITEM_LIST.filter((item) => filter === 'all' || item.slot === filter).filter((item) => {
        const cost = Math.max(1, item.cost - discount)
        return !affordableOnly || player.gold >= cost
      }).map((item) => {
        const cost = Math.max(1, item.cost - discount)
        const replaces = player.items.find(
          (id) => ITEMS[id].slot === item.slot && id !== item.id
        )
        const disabled =
          player.gold < cost ||
          isPurchasing(item.id) ||
          owned(item) ||
          (item.slot === 'consumable' && consumablesFull)
        return (
          <button
            key={item.id}
            className="shop-item"
            disabled={disabled}
            onClick={() => {
              sfx.coin()
              buyItem(item.id)
            }}
            title={replaces ? `Replaces ${ITEMS[replaces].name}` : item.desc}
          >
            <img src={itemArt(item.id)} alt={item.name} />
            <div className="shop-item-name">{item.name}</div>
            <div className="shop-item-desc">{item.desc}</div>
            {replaces && <div className="shop-compare">Replaces {ITEMS[replaces].name}</div>}
            <div className="shop-item-cost">
              💰 {cost} <span className="shop-slot">{item.slot}</span>
            </div>
            {owned(item) && <div className="shop-owned">owned</div>}
          </button>
        )
      })}
    </div>
  )
}

function TrainerTab({ player, buyAbility }) {
  const slots = maxAbilitySlots(player.level)
  const free = slots - player.abilities.length
  const pool = trainableForHero(player.heroId)

  return (
    <>
      <div className="trainer-slots">
        Ability slots: <b>{player.abilities.length}/{slots}</b>
        {slots < 4 && <span className="trainer-hint"> · next slot at level {player.level < 2 ? 2 : player.level < 4 ? 4 : 5}</span>}
        {free > 0 && <span className="trainer-free"> · {free} free</span>}
      </div>
      <div className="shop-grid">
        {pool.map((ab) => {
          const owned = player.abilities.includes(ab.id)
          const disabled = owned || free <= 0 || player.gold < ab.cost
          return (
            <button
              key={ab.id}
              className="shop-item"
              disabled={disabled}
              onClick={() => {
                sfx.levelup()
                buyAbility(ab.id)
              }}
              title={
                owned
                  ? 'Already learned'
                  : free <= 0
                    ? 'No free ability slot — level up to unlock more'
                    : ab.desc
              }
            >
              <img src={abilityArt(ab.id)} alt={ab.name} />
              <div className="shop-item-name">{ab.name}</div>
              <div className="shop-item-desc">
                {ab.desc}
                {ab.type === 'active' ? ` (${ab.energy}⚡)` : ' (passive)'}
              </div>
              <div className="shop-item-cost">
                💰 {ab.cost} <span className="shop-slot">{ab.type}</span>
              </div>
              {owned && <div className="shop-owned">learned</div>}
            </button>
          )
        })}
      </div>
    </>
  )
}

export default function ShopModal() {
  const open = useGame((s) => s.shopOpen)
  const openShop = useGame((s) => s.openShop)
  const buyItem = useGame((s) => s.buyItem)
  const buyAbility = useGame((s) => s.buyAbility)
  const [tab, setTab] = useState('items')
  const [filter, setFilter] = useState('all')
  const [affordableOnly, setAffordableOnly] = useState(false)
  const purchaseLocks = useRef(new Set())
  const purchaseSeq = useRef(0)
  const [, redrawLocks] = useState(0)
  const player = useGame(selCurrentPlayer)
  const discount = useGame((s) => selEventMod(s).shopDiscount || 0)
  const turnId = useGame((s) => s.turnId)
  if (!open || !player) return null

  const guardedPurchase = (itemId) => {
    if (purchaseLocks.current.has(itemId)) return
    purchaseLocks.current.add(itemId)
    redrawLocks((value) => value + 1)
    purchaseSeq.current += 1
    buyItem(itemId, { turnId, requestId: `shop-${turnId}-${itemId}-${purchaseSeq.current}` })
    window.setTimeout(() => {
      purchaseLocks.current.delete(itemId)
      redrawLocks((value) => value + 1)
    }, 450)
  }

  return (
    <ModalShell className="shop-modal" ariaLabel="Town market and trainer" onClose={() => openShop(false)} closeOnBackdrop>
        <div className="shop-tabs">
          <button className={`chip ${tab === 'items' ? 'chip-on' : ''}`} onClick={() => setTab('items')}>
            🛒 Market{discount ? ` (−${discount}!)` : ''}
          </button>
          <button className={`chip ${tab === 'trainer' ? 'chip-on' : ''}`} onClick={() => setTab('trainer')}>
            ✨ Trainer
          </button>
          <span className="shop-gold">💰 {player.gold}</span>
        </div>
        {tab === 'items' && (
          <div className="shop-filters" aria-label="Market filters">
            {['all', 'weapon', 'armor', 'trinket', 'consumable'].map((slot) => (
              <button
                key={slot}
                className={`chip ${filter === slot ? 'chip-on' : ''}`}
                aria-pressed={filter === slot}
                onClick={() => setFilter(slot)}
              >
                {slot === 'all' ? 'All' : slot[0].toUpperCase() + slot.slice(1)}
              </button>
            ))}
            <label className="shop-affordable">
              <input type="checkbox" checked={affordableOnly} onChange={(event) => setAffordableOnly(event.target.checked)} />
              Affordable
            </label>
          </div>
        )}
        {tab === 'items' ? (
          <ItemsTab
            player={player}
            discount={discount}
            buyItem={guardedPurchase}
            filter={filter}
            affordableOnly={affordableOnly}
            isPurchasing={(itemId) => purchaseLocks.current.has(itemId)}
          />
        ) : (
          <TrainerTab player={player} buyAbility={buyAbility} />
        )}
        <div className="shop-footer"><button className="btn-primary" onClick={() => openShop(false)}>Done</button></div>
    </ModalShell>
  )
}
