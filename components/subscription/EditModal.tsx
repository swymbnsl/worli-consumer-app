import SubscriptionBottomSheet, {
    SubscriptionBottomSheetRef,
    calculateTotalBottles,
} from "@/components/cart/SubscriptionBottomSheet"
import {
    showErrorToast,
    showSuccessToast,
    showInfoToast,
} from "@/components/ui/Toast"
import { CartItem } from "@/stores/cart-store"
import { fetchProductById, updateSubscription } from "@/lib/supabase-service"
import { Subscription, Product } from "@/types/database.types"
import React, { useEffect, useRef } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"

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
  const router = useRouter()

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
              bottomSheetRef.current?.open(product, editItem, subscription)
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
        onEditSubscription={async (updatedItem: Omit<CartItem, "id">, product: Product) => {
          try {
            // Get remaining bottles from subscription
            const remainingBottles = (subscription as any).remaining_bottles || 0
            
            if (remainingBottles <= 0) {
              showErrorToast("Error", "Cannot edit subscription with no remaining bottles")
              return
            }
            
            // Calculate current remaining value
            const currentRemainingAmount = remainingBottles * product.price
            
            // Calculate new remaining value with updated settings
            // We need to calculate how many bottles the new settings would need
            // for the same remaining period
            const durationMonths = (subscription as any).duration_months || 1
            const newTotalBottles = calculateTotalBottles(
              updatedItem.frequency,
              updatedItem.quantity,
              durationMonths,
              updatedItem.intervalDays,
              updatedItem.customQuantities
            )
            const newRemainingAmount = newTotalBottles * product.price
            
            // Check if settings actually changed
            const settingsChanged = 
              subscription.quantity !== updatedItem.quantity ||
              subscription.frequency !== updatedItem.frequency ||
              subscription.interval_days !== (updatedItem.intervalDays || null) ||
              JSON.stringify(subscription.custom_quantities) !== JSON.stringify(updatedItem.customQuantities || null) ||
              subscription.delivery_time !== (updatedItem.preferredDeliveryTime || null)
            
            if (!settingsChanged) {
              showInfoToast("No Changes", "No changes were made to the subscription")
              onClose()
              return
            }
            
            // Calculate payment difference
            const difference = Math.round(newRemainingAmount - currentRemainingAmount)
            
            // If new amount is MORE, user needs to pay the difference
            if (difference > 0) {
              showErrorToast(
                "Payment Required",
                `Upgrading your subscription requires an additional payment of ₹${difference}. Please contact support to upgrade.`
              )
              onClose()
              return
            }
            
            // If new amount is same or less, update directly
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
