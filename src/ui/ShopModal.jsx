import { useGame, selCurrentPlayer, selEventMod } from '../game/store'
import { ITEM_LIST, ITEMS, itemArt } from '../data/items'
import { GAME } from '../data/constants'

export default function ShopModal() {
  const open = useGame((s) => s.shopOpen)
  const openShop = useGame((s) => s.openShop)
  const buyItem = useGame((s) => s.buyItem)
  const state = useGame()
  const player = selCurrentPlayer(state)
  if (!open || !player) return null
  const discount = selEventMod(state).shopDiscount || 0

  const owned = (item) =>
    item.slot !== 'consumable' && player.items.includes(item.id)
  const consumablesFull = player.consumables.length >= GAME.MAX_CONSUMABLES

  return (
    <div className="overlay" onClick={() => openShop(false)}>
      <div className="modal shop-modal" onClick={(e) => e.stopPropagation()}>
        <h2>🛒 Market {discount ? <span className="sale-tag">Caravan sale −{discount}!</span> : null}</h2>
        <div className="shop-gold">Your gold: 💰 {player.gold}</div>
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
                onClick={() => buyItem(item.id)}
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
        <button className="btn-primary" onClick={() => openShop(false)}>Done</button>
      </div>
    </div>
  )
}
