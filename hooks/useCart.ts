import { useCartStore, getItemTotal } from "@/stores/cart-store"

export const useCart = () => {
  const store = useCartStore()
  // Add derived properties that were in CartContext
  return {
    ...store,
    itemCount: store.items.length,
    totalAmount: store.items.reduce((sum, item) => sum + getItemTotal(item), 0)
  }
}
