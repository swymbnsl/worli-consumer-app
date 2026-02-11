import CartItemCard from "@/components/cart/CartItemCard"
import SubscriptionBottomSheet, {
  SubscriptionBottomSheetRef,
} from "@/components/cart/SubscriptionBottomSheet"
import Button from "@/components/ui/Button"
import PageHeader from "@/components/ui/PageHeader"
import { COLORS } from "@/constants/theme"
import { CartItem } from "@/context/CartContext"
import { useAuth } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { useWallet } from "@/hooks/useWallet"
import {
  createSubscriptions,
  fetchProductById,
  fetchUserAddresses,
} from "@/lib/supabase-service"
import { Address, Product } from "@/types/database.types"
import { formatCurrency } from "@/utils/formatters"
import { useRouter } from "expo-router"
import { MapPin, Wallet as WalletIcon } from "lucide-react-native"
import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CartScreen() {
  const router = useRouter()
  const { items, removeItem, updateItem, clearCart, totalAmount, itemCount } =
    useCart()
  const { user } = useAuth()
  const { wallet } = useWallet()

  const subscriptionSheetRef = useRef<SubscriptionBottomSheetRef>(null)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [productCache, setProductCache] = useState<Record<string, Product>>({})
  const [loading, setLoading] = useState(false)
  const [placing, setPlacing] = useState(false)

  // ─── Fetch addresses ────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    fetchUserAddresses(user.id)
      .then((addrs) => {
        setAddresses(addrs)
        const defaultAddr = addrs.find((a) => a.is_default) || addrs[0] || null
        setSelectedAddress(defaultAddr)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

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

  const handlePlaceOrder = async () => {
    if (!user?.id) {
      Alert.alert("Login Required", "Please log in to place an order.")
      return
    }
    if (items.length === 0) {
      Alert.alert("Cart Empty", "Add items to your cart first.")
      return
    }
    if (!selectedAddress) {
      Alert.alert("No Address", "Please add a delivery address first.")
      return
    }

    const walletBalance = wallet?.balance ?? 0
    if (walletBalance < totalAmount) {
      Alert.alert(
        "Insufficient Balance",
        "Please recharge your wallet to proceed.",
      )
      return
    }

    setPlacing(true)
    try {
      const subscriptions = items.map((item) => ({
        user_id: user.id,
        product_id: item.productId,
        address_id: selectedAddress.id,
        quantity: item.quantity,
        frequency: item.frequency,
        start_date: item.startDate,
        interval_days: item.intervalDays || null,
        custom_quantities: item.customQuantities || null,
        status: "active" as const,
      }))
      await createSubscriptions(subscriptions)
      clearCart()
      Alert.alert("Success", "Your subscriptions have been placed!", [
        { text: "OK", onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to place order.")
    } finally {
      setPlacing(false)
    }
  }

  // ─── Clear Cart Handler ─────────────────────────────────────────────

  const handleClearCart = () => {
    if (items.length === 0) return
    Alert.alert("Clear Cart", "Remove all items from your cart?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearCart },
    ])
  }

  // ─── Wallet Balance ─────────────────────────────────────────────────

  const walletBalance = wallet?.balance ?? 0

  // ─── Main Render ────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header */}
      <PageHeader
        title="Checkout"
        rightComponent={
          <TouchableOpacity onPress={handleClearCart}>
            <Text className="font-sofia-bold text-sm text-functional-error">
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
            {items.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onRemove={removeItem}
                onQuantityChange={handleQtyChange}
              />
            ))}

            {/* Subscriptions Total */}
            <View className="flex-row justify-between items-center mt-4 mb-6 px-1">
              <View className="flex-row items-center">
                <Text className="font-sofia-bold text-base text-primary-navy">
                  Subscriptions amount
                </Text>
                <Text className="font-comfortaa text-xs text-neutral-gray ml-1">
                  (i)
                </Text>
              </View>
              <Text className="font-sofia-bold text-lg text-primary-navy">
                {formatCurrency(totalAmount)}
              </Text>
            </View>

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
                      Delivering To {selectedAddress?.landmark || "Home"}
                    </Text>
                    <TouchableOpacity>
                      <Text className="font-sofia-bold text-xs text-primary-orange">
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

            {/* Wallet Balance */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-neutral-lightGray">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <WalletIcon size={20} color={COLORS.primary.navy} />
                  <Text className="font-sofia-bold text-sm text-primary-navy ml-3">
                    Wallet Balance
                  </Text>
                </View>
                <Text className="font-sofia-bold text-base text-functional-success">
                  {formatCurrency(walletBalance)}
                </Text>
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
              <Text className="font-comfortaa text-sm text-neutral-darkGray">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </Text>
              <Text className="font-sofia-bold text-xl text-primary-navy">
                {formatCurrency(totalAmount)}
              </Text>
            </View>
            <Button
              title={placing ? "Placing Order..." : "Place Order"}
              onPress={handlePlaceOrder}
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
    </View>
  )
}
