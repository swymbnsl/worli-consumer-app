import { useAuth } from "@/hooks/useAuth"
import {
  cancelAbandonedCartReminder,
  queueAbandonedCartReminder,
} from "@/lib/notification-service"
import {
  clearUserCart,
  deleteCartItem,
  fetchCartItems,
  insertCartItem,
  updateCartItemDb,
} from "@/lib/supabase-service"
import React, { createContext, useEffect, useMemo, useState } from "react"

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
  addressId?: string // per-item delivery address
  addressName?: string // display label for the address
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
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])

  // Fetch cart items from DB on mount, joined with product data
  useEffect(() => {
    if (!user?.id) {
      setItems([])
      return
    }

    ;(async () => {
      try {
        const data = await fetchCartItems(user.id)
        setItems(
          data.map((row: any) => {
            const product = row.products
            return {
              id: row.id,
              productId: row.product_id,
              productName: product?.name || "",
              productPrice: product?.price || 0,
              productImage: product?.image_url || null,
              productVolume: product?.volume || null,
              quantity: row.quantity,
              frequency: row.frequency,
              startDate: row.start_date,
              intervalDays: row.interval_days,
              customQuantities: row.custom_quantities,
              preferredDeliveryTime: row.preferred_delivery_time,
              addressId: row.address_id,
            }
          }),
        )
      } catch (error) {
        console.error("Error fetching cart items:", error)
      }
    })()
  }, [user?.id])

  const addItem = async (item: Omit<CartItem, "id">) => {
    if (!user?.id) return

    try {
      const data = await insertCartItem({
        user_id: user.id,
        product_id: item.productId,
        quantity: item.quantity,
        frequency: item.frequency,
        start_date: item.startDate,
        interval_days: item.intervalDays,
        custom_quantities: item.customQuantities,
        preferred_delivery_time: item.preferredDeliveryTime,
        address_id: item.addressId,
      })

      if (data) {
        const newItems = [
          ...items,
          {
            ...item,
            id: data.id,
          },
        ]
        setItems(newItems)

        // Update abandoned cart timer
        const newTotal = newItems.reduce((sum, i) => sum + getItemTotal(i), 0)
        if (user.phone_number) {
          queueAbandonedCartReminder(
            user.id,
            user.phone_number,
            newTotal,
            newItems.length,
          ).catch(console.error)
        }
      }
    } catch (error) {
      console.error("Error adding item to cart:", error)
    }
  }

  const removeItem = async (itemId: string) => {
    if (!user?.id) return

    try {
      // Remove from DB
      await deleteCartItem(itemId)

      const newItems = items.filter((i) => i.id !== itemId)
      setItems(newItems)

      // Manage abandoned cart timer
      if (newItems.length === 0) {
        cancelAbandonedCartReminder(user.id).catch(console.error)
      } else if (user.phone_number) {
        const newTotal = newItems.reduce((sum, i) => sum + getItemTotal(i), 0)
        queueAbandonedCartReminder(
          user.id,
          user.phone_number,
          newTotal,
          newItems.length,
        ).catch(console.error)
      }
    } catch (error) {
      console.error("Error removing item from cart:", error)
    }
  }

  const updateItem = async (
    itemId: string,
    updates: Partial<Omit<CartItem, "id">>,
  ) => {
    if (!user?.id) return

    // Map app model keys to DB column names.
    const dbUpdates: Record<string, unknown> = {
      product_id: updates.productId,
      quantity: updates.quantity,
      frequency: updates.frequency,
      start_date: updates.startDate,
      interval_days: updates.intervalDays,
      custom_quantities: updates.customQuantities,
      preferred_delivery_time: updates.preferredDeliveryTime,
      address_id: updates.addressId,
    }

    const filteredDbUpdates = Object.fromEntries(
      Object.entries(dbUpdates).filter(([, value]) => value !== undefined),
    )

    try {
      // Update DB
      await updateCartItemDb(user.id, itemId, filteredDbUpdates)

      const newItems = items.map((i) =>
        i.id === itemId ? { ...i, ...updates } : i,
      )
      setItems(newItems)

      // Update abandoned cart timer
      if (user.phone_number) {
        const newTotal = newItems.reduce((sum, i) => sum + getItemTotal(i), 0)
        queueAbandonedCartReminder(
          user.id,
          user.phone_number,
          newTotal,
          newItems.length,
        ).catch(console.error)
      }
    } catch (error) {
      console.error("Error updating item in cart:", error)
    }
  }

  const clearCart = async () => {
    if (!user?.id) return

    try {
      await clearUserCart(user.id)
      setItems([])
      cancelAbandonedCartReminder(user.id).catch(console.error)
    } catch (error) {
      console.error("Error clearing cart:", error)
    }
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
