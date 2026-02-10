import DatePickerModal from "@/components/cart/DatePickerModal"
import Button from "@/components/ui/Button"
import PageHeader from "@/components/ui/PageHeader"
import { PRODUCT } from "@/constants/product"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { useWallet } from "@/hooks/useWallet"
import { createOrder, fetchUserAddresses } from "@/lib/supabase-service"
import { Address } from "@/types/database.types"
import { formatFullDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatters"
import { useRouter } from "expo-router"
import {
  AlertCircle,
  Calendar,
  Edit2,
  MapPin,
  Minus,
  Plus,
  Wallet,
} from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native"

export default function CartScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { wallet, deductFromWallet } = useWallet()
  const { cart, updateQuantity, updateDate, clearCart } = useCart()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)
  const [datePickerVisible, setDatePickerVisible] = useState(false)

  useEffect(() => {
    loadAddresses()
  }, [user])

  const loadAddresses = async () => {
    if (!user) return
    try {
      const data = await fetchUserAddresses(user.id)
      setAddresses(data)
    } catch (error) {
      console.error("Error fetching addresses:", error)
    }
  }

  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0]
  const totalCost = PRODUCT.price * cart.quantity
  const walletBalance = wallet?.balance ?? 0
  const canDeliver = wallet && walletBalance >= totalCost

  const handlePlaceOrder = async () => {
    if (!user || !wallet || !defaultAddress) return

    if (!canDeliver) {
      Alert.alert(
        "Insufficient Balance",
        `You need ${formatCurrency(totalCost - walletBalance)} more in your wallet.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Money", onPress: () => router.push("/(tabs)/wallet") },
        ],
      )
      return
    }

    Alert.alert(
      "Confirm Order",
      `Place order for ${cart.quantity} bottle${cart.quantity > 1 ? "s" : ""} on ${formatFullDate(cart.date)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setLoading(true)
            try {
              const orderNumber = `ORD${Date.now()}`

              await createOrder({
                order_number: orderNumber,
                user_id: user.id,
                delivery_date: cart.date,
                quantity: cart.quantity,
                amount: totalCost,
                status: "pending",
              })

              const success = await deductFromWallet(
                totalCost,
                `Order #${orderNumber}`,
              )
              if (!success) throw new Error("Failed to deduct from wallet")

              Alert.alert(
                "Order Placed!",
                `Your order has been placed successfully. Order ID: ${orderNumber}`,
                [
                  {
                    text: "View Orders",
                    onPress: () => {
                      clearCart()
                      router.replace("/(tabs)/orders")
                    },
                  },
                ],
              )
            } catch (error) {
              console.error("Error placing order:", error)
              Alert.alert("Error", "Failed to place order. Please try again.")
            } finally {
              setLoading(false)
            }
          },
        },
      ],
    )
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header */}
      <PageHeader title="Your Cart" subtitle="CHECKOUT" />

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Product Card */}
        <View className="bg-white rounded-2xl p-6 mb-5 shadow-md">
          <View className="flex-row items-center mb-5">
            <View className="w-20 h-20 rounded-xl bg-primary-cream items-center justify-center mr-5">
              <Text className="text-5xl">{PRODUCT.image}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-sofia-bold text-lg text-primary-navy mb-1">
                {PRODUCT.name}
              </Text>
              <Text className="font-comfortaa text-sm text-neutral-gray mb-2">
                {PRODUCT.size}
              </Text>
              <Text className="font-sofia-bold text-xl text-primary-orange">
                {formatCurrency(PRODUCT.price)}
              </Text>
            </View>
          </View>

          {/* Quantity Selector */}
          <View className="flex-row items-center justify-between bg-neutral-lightCream rounded-xl p-4">
            <Text className="font-comfortaa-bold text-base text-primary-navy">
              Quantity
            </Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-sm"
                onPress={() =>
                  cart.quantity > 1 && updateQuantity(cart.quantity - 1)
                }
              >
                <Minus size={20} color={COLORS.primary.navy} />
              </TouchableOpacity>
              <Text className="mx-6 font-sofia-bold text-xl text-primary-navy">
                {cart.quantity}
              </Text>
              <TouchableOpacity
                className="w-10 h-10 rounded-xl bg-primary-navy items-center justify-center shadow-md"
                onPress={() => updateQuantity(cart.quantity + 1)}
              >
                <Plus size={20} color={COLORS.neutral.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Delivery Date Card */}
        <View className="bg-white rounded-2xl p-5 mb-5 shadow-md">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-sofia-bold text-base text-primary-navy">
              Delivery Date
            </Text>
            <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
              <Calendar size={20} color={COLORS.primary.orange} />
            </TouchableOpacity>
          </View>
          <Text className="font-comfortaa text-base text-primary-navy mb-3">
            {formatFullDate(cart.date)}
          </Text>
          <View className="bg-primary-cream rounded-lg p-3 flex-row items-center">
            <AlertCircle size={16} color={COLORS.primary.orange} />
            <Text className="font-comfortaa text-xs text-neutral-darkGray ml-2 flex-1">
              Modify before 7 PM for next day delivery
            </Text>
          </View>
        </View>

        {/* Delivery Address Card */}
        <View className="bg-white rounded-2xl p-5 mb-5 shadow-md">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-sofia-bold text-base text-primary-navy">
              Delivery Address
            </Text>
            {/* @ts-ignore */}
            <TouchableOpacity onPress={() => router.push("/account/addresses")}>
              <Edit2 size={18} color={COLORS.primary.orange} />
            </TouchableOpacity>
          </View>
          {defaultAddress ? (
            <>
              <View className="bg-primary-cream px-3 py-1.5 rounded self-start mb-3">
                <Text className="font-sofia-bold text-xs text-primary-orange tracking-wide">
                  {defaultAddress.is_default ? "Default" : "Address"}
                </Text>
              </View>
              <Text className="font-comfortaa text-sm text-primary-navy mb-1">
                {defaultAddress.address_line1}
              </Text>
              {defaultAddress.address_line2 && (
                <Text className="font-comfortaa text-sm text-primary-navy mb-1">
                  {defaultAddress.address_line2}
                </Text>
              )}
              <Text className="font-comfortaa text-sm text-neutral-gray">
                {defaultAddress.city}, {defaultAddress.pincode}
              </Text>
            </>
          ) : (
            <View className="flex-row items-center p-3 bg-functional-error/10 rounded-lg">
              <MapPin size={16} color={COLORS.functional.error} />
              <Text className="font-comfortaa text-sm text-functional-error ml-2 flex-1">
                No address added. Please add a delivery address.
              </Text>
            </View>
          )}
        </View>

        {/* Payment Summary Card */}
        <View className="bg-white rounded-2xl p-5 mb-5 shadow-md">
          <Text className="font-sofia-bold text-base text-primary-navy mb-5">
            Payment Summary
          </Text>
          <View className="flex-row justify-between mb-4">
            <Text className="font-comfortaa text-base text-neutral-gray">
              Item Total
            </Text>
            <Text className="font-comfortaa-bold text-base text-primary-navy">
              {formatCurrency(totalCost)}
            </Text>
          </View>
          <View className="h-px bg-neutral-lightGray mb-4" />
          <View className="flex-row justify-between">
            <Text className="font-sofia-bold text-lg text-primary-navy">
              Total Amount
            </Text>
            <Text className="font-sofia-bold text-xl text-primary-orange">
              {formatCurrency(totalCost)}
            </Text>
          </View>
        </View>

        {/* Wallet Balance Card */}
        <View
          className={`rounded-2xl p-5 mb-5 flex-row items-center border ${
            canDeliver
              ? "bg-functional-success/10 border-functional-success"
              : "bg-functional-error/10 border-functional-error"
          }`}
        >
          <View
            className={`w-11 h-11 rounded-xl items-center justify-center mr-4 ${
              canDeliver ? "bg-functional-success" : "bg-functional-error"
            }`}
          >
            <Wallet size={22} color={COLORS.neutral.white} />
          </View>
          <View className="flex-1">
            <Text className="font-comfortaa text-sm text-neutral-gray mb-1">
              Wallet Balance
            </Text>
            <Text
              className={`font-sofia-bold text-lg ${
                canDeliver ? "text-functional-success" : "text-functional-error"
              }`}
            >
              {formatCurrency(wallet?.balance || 0)}
            </Text>
          </View>
        </View>

        {/* Insufficient Balance Alert */}
        {!canDeliver && wallet && (
          <View className="bg-functional-error/10 rounded-2xl p-5 mb-5 border border-functional-error">
            <View className="flex-row items-start">
              <AlertCircle size={20} color={COLORS.functional.error} />
              <View className="ml-3 flex-1">
                <Text className="font-sofia-bold text-base text-functional-error mb-1">
                  Insufficient Balance
                </Text>
                <Text className="font-comfortaa text-sm text-neutral-darkGray leading-5">
                  Please add {formatCurrency(totalCost - walletBalance)} to your
                  wallet to complete this order.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Place Order Button */}
        <View className="mb-8">
          <Button
            title={
              loading
                ? "Placing Order..."
                : canDeliver
                  ? "Place Order"
                  : "Add Money to Wallet"
            }
            onPress={handlePlaceOrder}
            variant="primary"
            size="large"
            isLoading={loading}
            disabled={!canDeliver || loading || !defaultAddress}
          />
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        selectedDate={cart.date}
        onSelectDate={(date) => {
          updateDate(date)
          setDatePickerVisible(false)
        }}
      />
    </View>
  )
}
