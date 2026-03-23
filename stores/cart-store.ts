import { create } from "zustand"
import { useAuthStore } from "./auth-store"
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

export type SubscriptionFrequency = "daily" | "custom" | "on_interval" | "buy_once"
export type CustomQuantities = Record<number, number>

export interface CartItem {
  id: string
  productId: string
  productName: string
  productPrice: number
  productImage: string | null
  productVolume: string | null
  quantity: number
  frequency: SubscriptionFrequency
  startDate: string
  intervalDays?: number
  customQuantities?: CustomQuantities
  preferredDeliveryTime?: string
  addressId?: string
  addressName?: string
}

export const getItemTotal = (item: CartItem): number => {
  if (item.frequency === "custom" && item.customQuantities) {
    const totalQty = Object.values(item.customQuantities).reduce((s, q) => s + q, 0)
    return item.productPrice * totalQty
  }
  return item.productPrice * item.quantity
}

interface CartState {
  items: CartItem[]
  
  // Actions
  fetchCart: () => Promise<void>
  addItem: (item: Omit<CartItem, "id">) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateItem: (itemId: string, updates: Partial<Omit<CartItem, "id">>) => Promise<void>
  clearCart: () => Promise<void>
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  fetchCart: async () => {
    const { user } = useAuthStore.getState()
    if (!user?.id) {
      set({ items: [] })
      return
    }
    
    try {
      const data = await fetchCartItems(user.id)
      const formattedItems = data.map((row: any) => {
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
      })
      set({ items: formattedItems })
    } catch (error) {
      console.error("Error fetching cart items:", error)
    }
  },

  addItem: async (item) => {
    const { user } = useAuthStore.getState()
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
        const newItems = [...get().items, { ...item, id: data.id }]
        set({ items: newItems })

        // Update abandoned cart timer
        const newTotal = newItems.reduce((sum, i) => sum + getItemTotal(i), 0)
        if (user.phone_number) {
          queueAbandonedCartReminder(user.id, user.phone_number, newTotal, newItems.length).catch(console.error)
        }
      }
    } catch (error) {
      console.error("Error adding item to cart:", error)
    }
  },

  removeItem: async (itemId) => {
    const { user } = useAuthStore.getState()
    if (!user?.id) return

    try {
      await deleteCartItem(itemId)
      const newItems = get().items.filter((i) => i.id !== itemId)
      set({ items: newItems })

      if (newItems.length === 0) {
        cancelAbandonedCartReminder(user.id).catch(console.error)
      } else if (user.phone_number) {
        const newTotal = newItems.reduce((sum, i) => sum + getItemTotal(i), 0)
        queueAbandonedCartReminder(user.id, user.phone_number, newTotal, newItems.length).catch(console.error)
      }
    } catch (error) {
      console.error("Error removing item from cart:", error)
    }
  },

  updateItem: async (itemId, updates) => {
    const { user } = useAuthStore.getState()
    if (!user?.id) return

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
      await updateCartItemDb(user.id, itemId, filteredDbUpdates)
      
      const newItems = get().items.map((i) => i.id === itemId ? { ...i, ...updates } : i)
      set({ items: newItems })

      if (user.phone_number) {
        const newTotal = newItems.reduce((sum, i) => sum + getItemTotal(i), 0)
        queueAbandonedCartReminder(user.id, user.phone_number, newTotal, newItems.length).catch(console.error)
      }
    } catch (error) {
      console.error("Error updating item in cart:", error)
    }
  },

  clearCart: async () => {
    const { user } = useAuthStore.getState()
    if (!user?.id) return

    try {
      await clearUserCart(user.id)
      set({ items: [] })
      cancelAbandonedCartReminder(user.id).catch(console.error)
    } catch (error) {
      console.error("Error clearing cart:", error)
    }
  }
}))
