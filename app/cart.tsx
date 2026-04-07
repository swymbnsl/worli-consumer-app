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
import { completeCheckout, initiateCheckout } from "@/lib/checkout-service"
import { cancelAbandonedCartReminder } from "@/lib/notification-service"
import { openRazorpayCheckout } from "@/lib/razorpay-service"
import {
    fetchProductById,
    fetchUserAddresses,
} from "@/lib/supabase-service"
import { CartItem } from "@/stores/cart-store"
import { Address, Product } from "@/types/database.types"
import { formatCurrency } from "@/utils/formatters"
import { useFocusEffect, useRouter } from "expo-router"
import { Check, MapPin, Wallet as WalletIcon } from "lucide-react-native"
import React, { useCallback, useRef, useState } from "react"
import {
    ActivityIndicator,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CartScreen() {
  const router = useRouter()
  const { items, removeItem, updateItem, clearCart, totalAmount, itemCount } =
    useCart()
  const { user } = useAuth()
  const { wallet, refreshWallet } = useWallet()

  const subscriptionSheetRef = useRef<SubscriptionBottomSheetRef>(null)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [productCache, setProductCache] = useState<Record<string, Product>>({})
  const [loading, setLoading] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [showClearCartModal, setShowClearCartModal] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showPlaceOrderModal, setShowPlaceOrderModal] = useState(false)
  const [useWalletBalance, setUseWalletBalance] = useState(true)

  // ─── State for checkout session ─────────────────────────────────────
  
  const [checkoutSession, setCheckoutSession] = useState<{
    session_id: string
    total_amount: number
    wallet_amount: number
    razorpay_amount: number
    razorpay_order_id: string | null
  } | null>(null)

  const walletBalance = wallet?.balance ?? 0

  // ─── Client-side estimates (for display only, server calculates actual) ────
  
  const estimatedWalletUsage = useWalletBalance 
    ? Math.min(walletBalance, totalAmount) 
    : 0
  
  const estimatedRazorpayAmount = Math.max(0, totalAmount - estimatedWalletUsage)

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

  // ─── Place Order ────────────────────────────────────────────────────

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

    // We no longer block checkout for insufficient balance, 
    // as we dynamically charge via Gateway using Razorpay.
    return true
  }

  const checkCutoffErrors = () => {
    // Basic client-side cutoff check to prevent invalid payments
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

  const handleConfirmOrder = async () => {
    if (!user?.id) return

    setPlacing(true)
    setShowPlaceOrderModal(false)
    
    try {
      // Step 1: Initiate checkout (server calculates all amounts)
      console.log("🚀 Initiating checkout...")
      const session = await initiateCheckout(useWalletBalance, selectedAddress?.id)
      
      setCheckoutSession(session)
      console.log("✓ Checkout session created:", session.session_id)
      console.log(`  Total: ₹${session.total_amount}`)
      console.log(`  Wallet: ₹${session.wallet_amount}`)
      console.log(`  Razorpay: ₹${session.razorpay_amount}`)

      // Step 2: Handle payment if needed
      if (session.razorpay_amount > 0 && session.razorpay_order_id) {
        console.log("💳 Opening Razorpay checkout...")
        
        try {
          const paymentResult = await openRazorpayCheckout({
            amount: session.razorpay_amount,
            orderId: session.razorpay_order_id,
            description: `Cart Checkout (${itemCount} items)`,
            prefill: {
              name: user.full_name || undefined,
              email: user.email || undefined,
              contact: user.phone_number || undefined,
            },
            notes: {
              user_id: user.id,
              purpose: "cart_checkout",
              session_id: session.session_id,
            },
          })

          console.log("✓ Payment successful:", paymentResult.razorpay_payment_id)

          // Step 3: Complete checkout with payment details
          console.log("⚡ Completing checkout...")
          const result = await completeCheckout(session.session_id, {
            razorpay_payment_id: paymentResult.razorpay_payment_id,
            razorpay_signature: paymentResult.razorpay_signature,
          })

          console.log(`✅ Checkout completed: ${result.subscriptions.length} subscriptions created`)
          
        } catch (error: any) {
          // User cancelled payment
          if (error?.code === 2) {
            console.log("ℹ️ Payment cancelled by user")
            showErrorToast("Cancelled", "Payment was cancelled")
            return
          }
          
          // Payment failed
          throw error
        }
      } else {
        // No payment needed - complete checkout directly
        console.log("⚡ Completing checkout (no payment needed)...")
        const result = await completeCheckout(session.session_id)
        console.log(`✅ Checkout completed: ${result.subscriptions.length} subscriptions created`)
      }

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
      setCheckoutSession(null)
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

            {/* Wallet Selection */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-neutral-lightGray">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <WalletIcon size={20} color={COLORS.primary.navy} />
                  <Text className="font-sofia-bold text-sm text-primary-navy ml-3">
                    Use Worli Wallet
                  </Text>
                </View>
                <Switch
                  value={useWalletBalance}
                  onValueChange={setUseWalletBalance}
                  trackColor={{ false: COLORS.neutral.lightGray, true: COLORS.primary.navy }}
                  thumbColor={COLORS.neutral.white}
                  disabled={walletBalance === 0}
                />
              </View>
              {useWalletBalance && walletBalance > 0 && (
                 <Text className="font-comfortaa text-xs text-neutral-darkGray mt-2 ml-8">
                   Current Balance: {formatCurrency(walletBalance)}
                 </Text>
              )}
              {walletBalance === 0 && (
                 <Text className="font-comfortaa text-xs text-functional-error mt-2 ml-8">
                   No balance available
                 </Text>
              )}
            </View>

            {/* Bill Details */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-neutral-lightGray">
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">Bill details</Text>
              
              <View className="flex-row items-center justify-between mb-2">
                 <Text className="font-comfortaa text-sm text-neutral-darkGray">Item total</Text>
                 <Text className="font-comfortaa text-sm text-primary-navy">{formatCurrency(totalAmount)}</Text>
              </View>

              {estimatedWalletUsage > 0 && (
                <View className="flex-row items-center justify-between mb-2">
                   <Text className="font-comfortaa text-sm text-functional-success">Wallet balance applied</Text>
                   <Text className="font-comfortaa text-sm text-functional-success">-{formatCurrency(estimatedWalletUsage)}</Text>
                </View>
              )}

              <View className="h-px bg-neutral-lightGray/60 my-2" />
              
              <View className="flex-row items-center justify-between">
                 <Text className="font-sofia-bold text-base text-primary-navy">To Pay</Text>
                 <Text className="font-sofia-bold text-base text-primary-navy">{formatCurrency(estimatedRazorpayAmount)}</Text>
              </View>
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
                  {estimatedRazorpayAmount > 0 ? "To Pay" : "Total Amount"}
                </Text>
                <Text className="font-comfortaa text-[10px] text-neutral-error mt-0.5">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </Text>
              </View>
              <Text className="font-sofia-bold text-xl text-primary-navy">
                {formatCurrency(estimatedRazorpayAmount > 0 ? estimatedRazorpayAmount : totalAmount)}
              </Text>
            </View>
            <Button
              title={placing ? "Processing..." : (estimatedRazorpayAmount > 0 ? `Pay ${formatCurrency(estimatedRazorpayAmount)} & Place Order` : "Place Order")}
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
        title={estimatedRazorpayAmount > 0 ? "Confirm Payment & Order" : "Confirm Order"}
        description={`Place order for ${itemCount} ${
          itemCount === 1 ? "item" : "items"
        }${estimatedRazorpayAmount > 0 ? ` by paying joining fee of ${formatCurrency(estimatedRazorpayAmount)}` : ` totaling ${formatCurrency(totalAmount)}`}?`}
        confirmText={estimatedRazorpayAmount > 0 ? `Pay ${formatCurrency(estimatedRazorpayAmount)}` : "Place Order"}
        onConfirm={handleConfirmOrder}
      />
    </View>
  )
}
