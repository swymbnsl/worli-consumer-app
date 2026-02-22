import SubscriptionBottomSheet, {
    SubscriptionBottomSheetRef,
} from "@/components/cart/SubscriptionBottomSheet"
import {
    showErrorToast,
    showSuccessToast,
} from "@/components/ui/Toast"
import { CartItem } from "@/context/CartContext"
import { fetchProductById, updateSubscription } from "@/lib/supabase-service"
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
      const fetchAndOpenSheet = async () => {
        try {
          const product = await fetchProductById(subscription.product_id!)

          if (product) {
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

            setTimeout(() => {
              bottomSheetRef.current?.open(product, editItem)
            }, 100)
          }
        } catch (error) {
          console.error("Error fetching product:", error)
        }
      }

      fetchAndOpenSheet()
    }
  }, [visible, subscription])

  const handleBottomSheetChange = async (index: number) => {
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
            await updateSubscription(subscription.id, {
              quantity: updatedItem.quantity,
              frequency: updatedItem.frequency,
              start_date: updatedItem.startDate,
              interval_days: updatedItem.intervalDays || null,
              custom_quantities: updatedItem.customQuantities || null,
              delivery_time: updatedItem.preferredDeliveryTime || null,
            })

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
