import SubscriptionBottomSheet, {
    SubscriptionBottomSheetRef,
} from "@/components/cart/SubscriptionBottomSheet"
import {
    showErrorToast,
    showSuccessToast,
} from "@/components/ui/Toast"
import { CartItem } from "@/context/CartContext"
import { supabase } from "@/lib/supabase"
import { Subscription } from "@/types/database.types"
import React, { useEffect, useRef } from "react"
import { View } from "react-native"

interface EditModalProps {
  visible: boolean
  onClose: () => void
  subscription: Subscription
  onUpdate: () => void
}

export default function EditModal({
  visible,
  onClose,
  subscription,
  onUpdate,
}: EditModalProps) {
  const bottomSheetRef = useRef<SubscriptionBottomSheetRef>(null)

  useEffect(() => {
    if (visible && subscription.product_id) {
      // Fetch product details and open bottom sheet
      const fetchAndOpenSheet = async () => {
        const { data: product, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", subscription.product_id)
          .single()

        if (product && !error) {
          // Convert subscription to CartItem format for editing
          const editItem: CartItem = {
            id: subscription.id,
            productId: subscription.product_id!,
            productName: product.name,
            productPrice: product.price,
            productImage: product.image_url,
            productVolume: product.volume,
            quantity: subscription.quantity || 1,
            frequency: (subscription.frequency as any) || "daily",
            startDate: subscription.start_date,
            intervalDays: subscription.interval_days || undefined,
            customQuantities:
              (subscription.custom_quantities as any) || undefined,
          }

          // Open bottom sheet with product and edit item
          setTimeout(() => {
            bottomSheetRef.current?.open(product, editItem)
          }, 100)
        }
      }

      fetchAndOpenSheet()
    }
  }, [visible, subscription])

  // Override the bottom sheet's behavior to save to database instead of cart
  const handleBottomSheetChange = async (index: number) => {
    // When bottom sheet closes (index -1), check if we need to update the subscription
    if (index === -1) {
      onClose()
    }
  }

  return (
    <View>
      <SubscriptionBottomSheet
        ref={bottomSheetRef}
        onEditSubscription={async (updatedItem: Omit<CartItem, "id">) => {
          try {
            const { error } = await supabase
              .from("subscriptions")
              .update({
                quantity: updatedItem.quantity,
                frequency: updatedItem.frequency,
                start_date: updatedItem.startDate,
                interval_days: updatedItem.intervalDays || null,
                custom_quantities: updatedItem.customQuantities || null,
                delivery_time: updatedItem.preferredDeliveryTime || null,
              })
              .eq("id", subscription.id)

            if (error) throw error

            showSuccessToast("Success", "Subscription updated successfully")
            onUpdate()
            onClose()
          } catch (error) {
            console.error("Error updating subscription:", error)
            showErrorToast("Error", "Failed to update subscription")
          }
        }}
      />
    </View>
  )
}
