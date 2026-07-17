import { useState } from 'react'
import { useGame, selCurrentPlayer, selEventMod } from '../game/store'
import { ITEM_LIST, ITEMS, itemArt } from '../data/items'
import { trainableForHero, abilityArt, maxAbilitySlots } from '../data/abilities'
import { GAME } from '../data/constants'
import { sfx } from '../game/sfx'

function ItemsTab({ player, discount, buyItem }) {
  const owned = (item) =>
    item.slot !== 'consumable' && player.items.includes(item.id)
  const consumablesFull = player.consumables.length >= GAME.MAX_CONSUMABLES

  return (
    <div className="shop-grid">
      {ITEM_LIST.map((item) => {
        const cost = Math.max(1, item.cost - discount)
        const replaces = player.items.find(
          (id) => ITEMS[id].slot === item.slot && id !== item.id
        )
        const disabled =
          player.gold < cost ||
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
  const state = useGame()
  const [tab, setTab] = useState('items')
  const player = selCurrentPlayer(state)
  if (!open || !player) return null
  const discount = selEventMod(state).shopDiscount || 0

  return (
    <div className="overlay" onClick={() => openShop(false)}>
      <div className="modal shop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shop-tabs">
          <button className={`chip ${tab === 'items' ? 'chip-on' : ''}`} onClick={() => setTab('items')}>
            🛒 Market{discount ? ` (−${discount}!)` : ''}
          </button>
          <button className={`chip ${tab === 'trainer' ? 'chip-on' : ''}`} onClick={() => setTab('trainer')}>
            ✨ Trainer
          </button>
          <span className="shop-gold">💰 {player.gold}</span>
        </div>
        {tab === 'items' ? (
          <ItemsTab player={player} discount={discount} buyItem={buyItem} />
        ) : (
          <TrainerTab player={player} buyAbility={buyAbility} />
        )}
        <button className="btn-primary" onClick={() => openShop(false)}>Done</button>
      </div>
    </div>
  )
}
