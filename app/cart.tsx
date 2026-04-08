import CartItemCard from "@/components/cart/CartItemCard"
import SubscriptionBottomSheet, {
    SubscriptionBottomSheetRef,
} from "@/components/cart/SubscriptionBottomSheet"
import Button from "@/components/ui/Button"
import Modal, { ConfirmModal } from "@/components/ui/Modal"
import PageHeader from "@/components/ui/PageHeader"
import {
    showErrorToast,
    showSuccessToast,
} from "@/components/ui/Toast"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { useWallet } from "@/hooks/useWallet"
import {
    checkBottleBalance,
    completeCheckout,
    InsufficientBottlesResponse,
} from "@/lib/checkout-service"
import { formatBottles } from "@/lib/bottle-utils"
import { cancelAbandonedCartReminder } from "@/lib/notification-service"
import {
    fetchProductById,
    fetchUserAddresses,
} from "@/lib/supabase-service"
import { CartItem } from "@/stores/cart-store"
import { Address, Product } from "@/types/database.types"
import { formatCurrency } from "@/utils/formatters"
import { useFocusEffect, useRouter } from "expo-router"
import { Check, MapPin, Milk } from "lucide-react-native"
import React, { useCallback, useRef, useState } from "react"
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CartScreen() {
  const router = useRouter()
  const { items, removeItem, updateItem, clearCart, itemCount } = useCart()
  const { user } = useAuth()
  const { bottleBalance, bottlePrice, refreshWallet, purchaseBottlesForCheckout } = useWallet()

  const subscriptionSheetRef = useRef<SubscriptionBottomSheetRef>(null)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [productCache, setProductCache] = useState<Record<string, Product>>({})
  const [loading, setLoading] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [showClearCartModal, setShowClearCartModal] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showPlaceOrderModal, setShowPlaceOrderModal] = useState(false)
  
  // Bottle purchase modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [bottleShortage, setBottleShortage] = useState<InsufficientBottlesResponse | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  // ─── Calculate total bottles for cart (client estimate) ─────────────
  
  const estimatedTotalBottles = items.reduce((total, item) => {
    const qty = item.quantity || 1
    const duration = item.durationMonths || 1
    
    if (item.frequency === "daily") {
      return total + qty * 30 * duration
    } else if (item.frequency === "custom" && item.customQuantities) {
      const weeklyTotal = Object.values(item.customQuantities).reduce((sum, q) => sum + q, 0)
      return total + weeklyTotal * 4 * duration
    } else if (item.frequency === "on_interval" && item.intervalDays) {
      return total + qty * Math.floor(30 / item.intervalDays) * duration
    } else if (item.frequency === "buy_once") {
      return total + qty
    }
    return total + qty * 30 * duration
  }, 0)

  const hasEnoughBottles = bottleBalance >= estimatedTotalBottles

  // ─── Fetch addresses ────────────────────────────────────────────────

  const isFirstLoad = useRef(true)

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return

      if (isFirstLoad.current) {
        setLoading(true)
        isFirstLoad.current = false
      }

      fetchUserAddresses(user.id)
        .then((addrs) => {
          setAddresses(addrs)
          setSelectedAddress((prev) => {
            // Keep the previous selection if it still exists
            if (prev && addrs.some((a) => a.id === prev.id)) return prev
            // Auto default if no previous selection or old selection deleted
            return addrs.find((a) => a.is_default) || addrs[0] || null
          })
        })
        .catch(() => {})
        .finally(() => setLoading(false))
      
      // Also refresh wallet to get latest bottle balance
      refreshWallet()
    }, [user?.id])
  )

  // ─── Cache products for editing ─────────────────────────────────────

  const getProduct = useCallback(
    async (productId: string): Promise<Product | null> => {
      if (productCache[productId]) return productCache[productId]
      try {
        const product = await fetchProductById(productId)
        if (product) {
          setProductCache((prev) => ({ ...prev, [productId]: product }))
        }
        return product
      } catch {
        return null
      }
    },
    [productCache],
  )

  // ─── Edit item ──────────────────────────────────────────────────────

  const handleEdit = async (item: CartItem) => {
    const product = await getProduct(item.productId)
    if (product) {
      subscriptionSheetRef.current?.open(product, item)
    }
  }

  // ─── Inline quantity update ─────────────────────────────────────────

  const handleQtyChange = (item: CartItem, delta: number) => {
    if (item.frequency === "custom") return // custom uses per-day qty
    const newQty = Math.max(1, Math.min(10, item.quantity + delta))
    updateItem(item.id, { quantity: newQty })
  }

  // ─── Validate Order ─────────────────────────────────────────────────

  const validateOrder = () => {
    if (!user?.id) {
      showErrorToast("Login Required", "Please log in to place an order.")
      return false
    }
    if (items.length === 0) {
      showErrorToast("Cart Empty", "Add items to your cart first.")
      return false
    }

    // Check that every item has an address (per-item or fallback)
    const missingAddress = items.some(
      (item) => !item.addressId && !selectedAddress,
    )
    if (missingAddress) {
      showErrorToast(
        "No Address",
        "Please select a delivery address for all items.",
      )
      return false
    }

    return true
  }

  const checkCutoffErrors = () => {
    // Basic client-side cutoff check to prevent invalid requests
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const nowIst = new Date(Date.now() + IST_OFFSET_MS)
    const isPastCutoff = nowIst.getUTCHours() >= 19

    const tomorrow = new Date(nowIst)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]

    for (const item of items) {
      if (item.frequency === "buy_once" && item.startDate === tomorrowStr && isPastCutoff) {
        showErrorToast("Cutoff Passed", `It is past 7 PM, so next-day delivery for "${item.productName}" is closed.`)
        return false
      }
    }
    return true
  }

  const handlePlaceOrderClick = () => {
    if (validateOrder() && checkCutoffErrors()) {
      setShowPlaceOrderModal(true)
    }
  }

  // ─── Confirm and Place Order ────────────────────────────────────────

  const handleConfirmOrder = async () => {
    if (!user?.id) return

    setPlacing(true)
    setShowPlaceOrderModal(false)
    
    try {
      // Step 1: Check bottle balance with server
      console.log("🥛 Checking bottle balance...")
      const checkResult = await checkBottleBalance(selectedAddress?.id)

      if (!checkResult.success) {
        // Insufficient bottles - show purchase modal
        const shortage = checkResult as InsufficientBottlesResponse
        console.log(`❌ Insufficient bottles: need ${shortage.bottles_required}, have ${shortage.bottles_available}`)
        setBottleShortage(shortage)
        setShowPurchaseModal(true)
        setPlacing(false)
        return
      }

      console.log(`✓ Bottle balance OK: ${checkResult.bottles_available} available, ${checkResult.bottles_required} required`)

      // Step 2: Complete checkout (no payment)
      console.log("⚡ Creating subscriptions...")
      const result = await completeCheckout(selectedAddress?.id)

      console.log(`✅ Checkout completed: ${result.subscriptions.length} subscriptions created`)
      console.log(`   Total bottles: ${result.total_bottles}`)
      console.log(`   Remaining balance: ${result.bottle_balance} bottles`)

      // Success!
      await refreshWallet()
      cancelAbandonedCartReminder(user.id).catch(console.error)
      clearCart()
      showSuccessToast("Success", "Your subscriptions have been placed!")
      router.back()
      
    } catch (err: any) {
      console.error("❌ Checkout failed:", err)
      const msg = err.message || "Failed to place order."
      showErrorToast("Checkout Failed", msg)
    } finally {
      setPlacing(false)
    }
  }

  // ─── Handle Bottle Purchase ─────────────────────────────────────────

  const handlePurchaseBottles = async () => {
    if (!bottleShortage) return

    setPurchasing(true)
    try {
      console.log(`💳 Purchasing ${bottleShortage.bottles_short} bottles...`)
      await purchaseBottlesForCheckout(bottleShortage.bottles_short)
      
      console.log("✓ Bottles purchased successfully")
      setShowPurchaseModal(false)
      setBottleShortage(null)
      
      // Refresh and retry checkout
      await refreshWallet()
      showSuccessToast("Bottles Added", "Now completing your order...")
      
      // Auto-retry checkout after purchase
      setTimeout(() => {
        handleConfirmOrder()
      }, 500)
      
    } catch (error: any) {
      // User cancelled payment
      if (error?.code === 2) {
        console.log("ℹ️ Payment cancelled by user")
        return
      }
      
      console.error("❌ Bottle purchase failed:", error)
      showErrorToast("Purchase Failed", error.message || "Could not purchase bottles")
    } finally {
      setPurchasing(false)
    }
  }

  // ─── Clear Cart Handler ─────────────────────────────────────────────

  const handleClearCart = () => {
    if (items.length === 0) return
    setShowClearCartModal(true)
  }

  // ─── Main Render ────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header */}
      <PageHeader
        title="Checkout"
        rightComponent={
          <TouchableOpacity onPress={handleClearCart}>
            <Text className="font-sofia-bold text-primary-navy text-sm text-functional-error">
              Clear Cart
            </Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary.navy} />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl mb-4">🛒</Text>
          <Text className="font-sofia-bold text-xl text-primary-navy text-center mb-2">
            Your cart is empty
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray text-center mb-6">
            Add products from the home page to get started
          </Text>
          <Button
            title="Browse Products"
            onPress={() => router.back()}
            variant="navy"
            size="medium"
            fullWidth={false}
          />
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 240 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Section Title */}
            <Text className="font-sofia-bold text-lg text-primary-navy mb-3">
              Subscriptions
            </Text>

            {/* Items */}
            {items.map((item, idx) => (
              <Animated.View key={item.id} entering={FadeInUp.duration(500).delay(idx * 60)}>
                <CartItemCard
                  item={item}
                  onEdit={handleEdit}
                  onRemove={removeItem}
                  onQuantityChange={handleQtyChange}
                />
              </Animated.View>
            ))}

            {/* Delivery Address */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-neutral-lightGray">
              <View className="flex-row items-start">
                <MapPin
                  size={20}
                  color={COLORS.primary.navy}
                  style={{ marginTop: 2 }}
                />
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-sofia-bold text-sm text-primary-navy">
                      Delivering To {selectedAddress?.name || "Home"}
                    </Text>
                    <TouchableOpacity onPress={() => setShowAddressModal(true)}>
                      <Text className="font-sofia-bold text-xs text-primary-navy  underline">
                        Change
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text
                    className="font-comfortaa text-xs text-neutral-darkGray leading-4"
                    numberOfLines={2}
                  >
                    {selectedAddress
                      ? [
                          selectedAddress.address_line1,
                          selectedAddress.address_line2,
                          selectedAddress.city,
                          selectedAddress.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : "No address selected"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottle Balance Card */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-neutral-lightGray">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Milk size={20} color={COLORS.primary.navy} />
                  <Text className="font-sofia-bold text-sm text-primary-navy ml-3">
                    Your Bottle Balance
                  </Text>
                </View>
                <Text className={`font-sofia-bold text-lg ${hasEnoughBottles ? "text-functional-success" : "text-functional-error"}`}>
                  {bottleBalance} bottles
                </Text>
              </View>
              
              {!hasEnoughBottles && (
                <View className="bg-functional-error/10 rounded-xl p-3">
                  <Text className="font-comfortaa text-xs text-functional-error">
                    You need {estimatedTotalBottles - bottleBalance} more bottles for this subscription.
                    You can purchase them during checkout.
                  </Text>
                </View>
              )}
              
              {hasEnoughBottles && (
                <View className="bg-functional-success/10 rounded-xl p-3">
                  <Text className="font-comfortaa text-xs text-functional-success">
                    You have enough bottles for this subscription.
                  </Text>
                </View>
              )}
            </View>

            {/* Subscription Details */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-neutral-lightGray">
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">Subscription Details</Text>
              
              <View className="flex-row items-center justify-between mb-2">
                 <Text className="font-comfortaa text-sm text-neutral-darkGray">Total bottles required</Text>
                 <Text className="font-sofia-bold text-sm text-primary-navy">{formatBottles(estimatedTotalBottles)}</Text>
              </View>

              <View className="flex-row items-center justify-between mb-2">
                 <Text className="font-comfortaa text-sm text-neutral-darkGray">Your current balance</Text>
                 <Text className={`font-sofia-bold text-sm ${hasEnoughBottles ? "text-functional-success" : "text-neutral-darkGray"}`}>
                   {formatBottles(bottleBalance)}
                 </Text>
              </View>

              {!hasEnoughBottles && (
                <View className="flex-row items-center justify-between mb-2">
                   <Text className="font-comfortaa text-sm text-functional-error">Bottles to purchase</Text>
                   <Text className="font-sofia-bold text-sm text-functional-error">
                     {formatBottles(estimatedTotalBottles - bottleBalance)}
                   </Text>
                </View>
              )}

              <View className="h-px bg-neutral-lightGray/60 my-2" />
              
              <View className="flex-row items-center justify-between">
                 <Text className="font-sofia-bold text-base text-primary-navy">
                   {hasEnoughBottles ? "No payment required" : "Amount to pay"}
                 </Text>
                 <Text className="font-sofia-bold text-base text-primary-navy">
                   {hasEnoughBottles 
                     ? "FREE" 
                     : formatCurrency((estimatedTotalBottles - bottleBalance) * bottlePrice)
                   }
                 </Text>
              </View>
              
              {!hasEnoughBottles && (
                <Text className="font-comfortaa text-xs text-neutral-gray mt-1 text-right">
                  @ {formatCurrency(bottlePrice)}/bottle
                </Text>
              )}
            </View>

            {/* Info Note */}
            <View className="bg-secondary-skyBlue/10 rounded-xl p-3 mb-4 border border-secondary-skyBlue/30">
              <Text className="font-comfortaa text-xs text-secondary-skyBlue">
                Bottles are deducted from your balance each day when your order is generated.
                No upfront payment is required - just make sure you have enough bottles!
              </Text>
            </View>
          </ScrollView>

          {/* Bottom CTA */}
          <View
            className="absolute bottom-0 left-0 right-0 bg-white px-6 pt-4 pb-8 border-t border-neutral-lightGray"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="font-comfortaa text-sm text-neutral-darkGray">
                  {hasEnoughBottles ? "Total Bottles" : "Bottles to Buy"}
                </Text>
                <Text className="font-comfortaa text-[10px] text-neutral-error mt-0.5">
                  {itemCount} {itemCount === 1 ? "subscription" : "subscriptions"}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-sofia-bold text-xl text-primary-navy">
                  {hasEnoughBottles 
                    ? formatBottles(estimatedTotalBottles)
                    : formatCurrency((estimatedTotalBottles - bottleBalance) * bottlePrice)
                  }
                </Text>
                {!hasEnoughBottles && (
                  <Text className="font-comfortaa text-xs text-neutral-gray">
                    {formatBottles(estimatedTotalBottles - bottleBalance)}
                  </Text>
                )}
              </View>
            </View>
            <Button
              title={
                placing 
                  ? "Processing..." 
                  : hasEnoughBottles 
                    ? "Subscribe Now" 
                    : `Buy Bottles & Subscribe`
              }
              onPress={handlePlaceOrderClick}
              variant="navy"
              size="large"
              disabled={placing || items.length === 0}
              isLoading={placing}
            />
          </View>
        </>
      )}

      {/* Bottom Sheet for editing */}
      <SubscriptionBottomSheet ref={subscriptionSheetRef} />

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        title="Select Address"
        description="Choose a delivery location"
      >
        <ScrollView className="max-h-96 w-full" showsVerticalScrollIndicator={false}>
          {addresses.length === 0 ? (
            <Text className="text-center font-comfortaa text-neutral-gray py-4">
              No addresses found. Please add one in your profile.
            </Text>
          ) : (
            addresses.map((addr) => {
              const isSelected = selectedAddress?.id === addr.id
              return (
                <TouchableOpacity
                  key={addr.id}
                  className={`flex-row items-center border rounded-xl p-4 mb-3 ${
                    isSelected
                      ? "border-primary-navy bg-primary-navy/5"
                      : "border-neutral-lightGray"
                  }`}
                  onPress={() => {
                    setSelectedAddress(addr)
                    setShowAddressModal(false)
                  }}
                >
                  <View className="mr-3">
                    <MapPin
                      size={20}
                      color={
                        isSelected ? COLORS.primary.navy : COLORS.neutral.gray
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-sofia-bold text-sm mb-1 ${
                        isSelected
                          ? "text-primary-navy"
                          : "text-neutral-darkGray"
                      }`}
                    >
                      {addr.name || "Home"}
                    </Text>
                    <Text
                      className="font-comfortaa text-xs text-neutral-gray"
                      numberOfLines={2}
                    >
                      {[
                        addr.address_line1,
                        addr.address_line2,
                        addr.city,
                        addr.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>
                  {isSelected && (
                    <View className="ml-2">
                      <Check size={20} color={COLORS.primary.navy} />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })
          )}
          <View className="mt-4 pb-2">
            <Button
              title="Add New Address"
              onPress={() => {
                setShowAddressModal(false)
                router.push("/add-address")
              }}
              variant="outline"
              size="medium"
            />
          </View>
        </ScrollView>
      </Modal>

      {/* Clear Cart Confirmation */}
      <ConfirmModal
        visible={showClearCartModal}
        onClose={() => setShowClearCartModal(false)}
        title="Clear Cart"
        description="Remove all items from your cart?"
        confirmText="Clear"
        onConfirm={() => {
          setShowClearCartModal(false)
          clearCart()
        }}
        destructive
      />

      {/* Place Order Confirmation */}
      <ConfirmModal
        visible={showPlaceOrderModal}
        onClose={() => setShowPlaceOrderModal(false)}
        title={hasEnoughBottles ? "Confirm Subscription" : "Buy Bottles & Subscribe"}
        description={
          hasEnoughBottles
            ? `Start ${itemCount} ${itemCount === 1 ? "subscription" : "subscriptions"} using ${formatBottles(estimatedTotalBottles)} from your balance?`
            : `Purchase ${formatBottles(estimatedTotalBottles - bottleBalance)} for ${formatCurrency((estimatedTotalBottles - bottleBalance) * bottlePrice)} and start your subscriptions?`
        }
        confirmText={hasEnoughBottles ? "Subscribe" : "Buy & Subscribe"}
        onConfirm={handleConfirmOrder}
      />

      {/* Bottle Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false)
          setBottleShortage(null)
        }}
        title="Purchase Bottles"
        description="You need more bottles to start this subscription"
      >
        {bottleShortage && (
          <View className="w-full">
            <View className="bg-primary-cream/20 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-comfortaa text-sm text-neutral-darkGray">Bottles needed</Text>
                <Text className="font-sofia-bold text-sm text-primary-navy">
                  {formatBottles(bottleShortage.bottles_required)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-comfortaa text-sm text-neutral-darkGray">Your balance</Text>
                <Text className="font-sofia-bold text-sm text-neutral-darkGray">
                  {formatBottles(bottleShortage.bottles_available)}
                </Text>
              </View>
              <View className="h-px bg-neutral-lightGray/60 my-2" />
              <View className="flex-row items-center justify-between">
                <Text className="font-sofia-bold text-sm text-functional-error">Bottles short</Text>
                <Text className="font-sofia-bold text-sm text-functional-error">
                  {formatBottles(bottleShortage.bottles_short)}
                </Text>
              </View>
            </View>

            <View className="bg-primary-navy/5 rounded-xl p-4 mb-6">
              <View className="flex-row items-center justify-between">
                <Text className="font-sofia-bold text-base text-primary-navy">Amount to pay</Text>
                <Text className="font-sofia-bold text-xl text-primary-navy">
                  {formatCurrency(bottleShortage.amount_to_recharge)}
                </Text>
              </View>
              <Text className="font-comfortaa text-xs text-neutral-gray mt-1">
                {formatBottles(bottleShortage.bottles_short)} @ {formatCurrency(bottleShortage.bottle_price)}/bottle
              </Text>
            </View>

            <Button
              title={purchasing ? "Processing..." : `Pay ${formatCurrency(bottleShortage.amount_to_recharge)}`}
              onPress={handlePurchaseBottles}
              variant="navy"
              size="large"
              disabled={purchasing}
              isLoading={purchasing}
              className="mb-3"
            />
            
            <Button
              title="Cancel"
              onPress={() => {
                setShowPurchaseModal(false)
                setBottleShortage(null)
              }}
              variant="outline"
              size="medium"
              disabled={purchasing}
            />
          </View>
        )}
      </Modal>
    </View>
  )
}
