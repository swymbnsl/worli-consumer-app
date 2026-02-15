import React, { createContext, useMemo, useState } from "react"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SubscriptionFrequency =
  | "daily"
  | "custom"
  | "on_interval"
  | "buy_once"

/** Per-day quantities for "custom" mode: { 0: 2, 1: 1, ... } where key = weekday index (0=Sun) */
export type CustomQuantities = Record<number, number>

export interface CartItem {
  id: string
  productId: string
  productName: string
  productPrice: number
  productImage: string | null
  productVolume: string | null
  quantity: number // used for daily / on_interval / buy_once
  frequency: SubscriptionFrequency
  startDate: string // YYYY-MM-DD
  intervalDays?: number // for on_interval (2,3,4…30)
  customQuantities?: CustomQuantities // for custom (per-day qty)
  preferredDeliveryTime?: string // delivery slot (e.g. "09:00-10:00")
}

export interface CartContextType {
  items: CartItem[]
  itemCount: number
  totalAmount: number
  addItem: (item: Omit<CartItem, "id">) => void
  removeItem: (itemId: string) => void
  updateItem: (itemId: string, updates: Partial<Omit<CartItem, "id">>) => void
  clearCart: () => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const generateId = () =>
  `cart_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

/** Compute the total per-delivery cost for a single cart item */
export const getItemTotal = (item: CartItem): number => {
  if (item.frequency === "custom" && item.customQuantities) {
    // Sum of all per-day quantities × price
    const totalQty = Object.values(item.customQuantities).reduce(
      (s, q) => s + q,
      0,
    )
    return item.productPrice * totalQty
  }
  return item.productPrice * item.quantity
}

// ─── Context ───────────────────────────────────────────────────────────────────

export const CartContext = createContext<CartContextType>({
  items: [],
  itemCount: 0,
  totalAmount: 0,
  addItem: () => {},
  removeItem: () => {},
  updateItem: () => {},
  clearCart: () => {},
})

// ─── Provider ──────────────────────────────────────────────────────────────────

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (item: Omit<CartItem, "id">) => {
    const newItem: CartItem = { ...item, id: generateId() }
    setItems((prev) => [...prev, newItem])
  }

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  const updateItem = (
    itemId: string,
    updates: Partial<Omit<CartItem, "id">>,
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const itemCount = items.length

  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + getItemTotal(i), 0),
    [items],
  )

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        totalAmount,
        addItem,
        removeItem,
        updateItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
