import { useCartStore } from "@/stores/cart-store"

export const useCart = () => {
  const store = useCartStore()
  // Add derived properties that were in CartContext
  return {
    ...store,
    itemCount: store.items.length,
    totalAmount: store.items.reduce((sum, i) => {
      // Inline simple getItemTotal logic for the hook or export it
      if (i.frequency === "custom" && i.customQuantities) {
        const totalQty = Object.values(i.customQuantities).reduce((s, q) => s + q, 0)
        return sum + (i.productPrice * totalQty)
      }
      return sum + (i.productPrice * i.quantity)
    }, 0)
  }
}
