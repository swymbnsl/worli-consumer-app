import Button from "@/components/ui/Button"
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { bottlesToAmount, formatBottles } from "@/lib/bottle-utils"
import { RazorpayError } from "@/lib/razorpay-service"
import { fetchAppSetting } from "@/lib/supabase-service"
import { formatCurrency } from "@/utils/formatters"
import { CheckCircle, Milk, ShieldCheck, XCircle } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"

type PaymentStatus = "idle" | "processing" | "success" | "failed"

export default function PurchaseBottlesCard() {
  const { user } = useAuth()
  const { purchaseBottles, bottlePrice, estimatedDaysLeft, subscriptions } = useWallet()
  const [bottles, setBottles] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")

  const [minBottles, setMinBottles] = useState<number>(10)
  const [suggestedBottles, setSuggestedBottles] = useState<
    { value: number; recommended: boolean; label?: string }[]
  >([
    { value: 30, recommended: false, label: "1 Month" },
    { value: 60, recommended: true, label: "2 Months" },
    { value: 90, recommended: false, label: "3 Months" },
  ])

  useEffect(() => {
    async function loadConfig() {
      try {
        const minValStr = await fetchAppSetting("min_bottles_recharge")
        if (minValStr) {
          const val = parseInt(minValStr, 10)
          if (!isNaN(val) && val > 0) setMinBottles(val)
        }
      } catch (error) {
        console.log("Error loading config", error)
      }
    }
    loadConfig()
  }, [])

  // Update suggestions based on daily consumption
  useEffect(() => {
    if (subscriptions.length > 0) {
      // Calculate daily consumption for dynamic suggestions
      let dailyBottles = 0
      for (const sub of subscriptions) {
        if (sub.status !== "active") continue
        const qty = sub.quantity || 1
        if (sub.frequency === "daily") {
          dailyBottles += qty
        } else if (sub.frequency === "custom" && sub.custom_quantities) {
          const weeklyTotal = Object.values(sub.custom_quantities).reduce(
            (sum: number, q: number) => sum + q,
            0
          )
          dailyBottles += weeklyTotal / 7
        } else if (sub.frequency === "on_interval" && sub.interval_days) {
          dailyBottles += qty / sub.interval_days
        }
      }

      if (dailyBottles > 0) {
        const monthlyBottles = Math.ceil(dailyBottles * 30)
        setSuggestedBottles([
          { value: monthlyBottles, recommended: false, label: "1 Month" },
          { value: monthlyBottles * 2, recommended: true, label: "2 Months" },
          { value: monthlyBottles * 3, recommended: false, label: "3 Months" },
        ])
      }
    }
  }, [subscriptions])

  const isLoading = paymentStatus === "processing"
  const bottlesNum = parseInt(bottles) || 0
  const amount = bottlesToAmount(bottlesNum, bottlePrice)

  const handlePurchase = async () => {
    if (!bottlesNum || bottlesNum <= 0) {
      showErrorToast("Invalid Amount", "Please enter number of bottles")
      return
    }

    if (bottlesNum < minBottles) {
      showErrorToast("Minimum Purchase", `Minimum purchase is ${minBottles} bottles`)
      return
    }

    setPaymentStatus("processing")
    try {
      await purchaseBottles(bottlesNum)
      setPaymentStatus("success")
      showSuccessToast("Success!", `${formatBottles(bottlesNum)} added to your balance`)

      // Reset after showing success briefly
      setTimeout(() => {
        setPaymentStatus("idle")
        setBottles("")
      }, 3000)
    } catch (error) {
      const rzpError = error as RazorpayError

      // User cancelled payment
      if (rzpError?.code === 2) {
        setPaymentStatus("idle")
        return
      }

      setPaymentStatus("failed")
      showErrorToast(
        "Payment Failed",
        rzpError?.description || "Something went wrong. Please try again."
      )
    }
  }

  // Success state
  if (paymentStatus === "success") {
    return (
      <View className="bg-white mx-4 rounded-2xl p-8 mb-5 shadow-lg">
        <View className="items-center py-4">
          <View className="w-20 h-20 bg-functional-success/10 rounded-full items-center justify-center mb-4">
            <CheckCircle size={40} color="#638C5F" strokeWidth={2} />
          </View>
          <Text className="font-sofia-bold text-2xl text-functional-success mb-2">
            Payment Successful!
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray text-center mb-2">
            {formatBottles(bottlesNum)} added to your balance
          </Text>
        </View>
      </View>
    )
  }

  // Failed state
  if (paymentStatus === "failed") {
    return (
      <View className="bg-white mx-4 rounded-2xl p-8 mb-5 shadow-lg">
        <View className="items-center py-4">
          <View className="w-20 h-20 bg-primary-navy/10 rounded-full items-center justify-center mb-4">
            <XCircle size={40} color="#101B53" strokeWidth={2} />
          </View>
          <Text className="font-sofia-bold text-2xl text-primary-navy mb-2">
            Payment Failed
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray text-center mb-4">
            Don't worry, no amount has been deducted.
          </Text>
          <Button
            title="Try Again"
            onPress={() => setPaymentStatus("idle")}
            variant="navy"
          />
        </View>
      </View>
    )
  }

  return (
    <View className="bg-white mx-4 rounded-2xl p-8 mb-5 shadow-lg">
      <View className="flex-row items-center mb-2">
        <Milk size={22} color="#101B53" strokeWidth={2} />
        <Text className="font-sofia-bold text-2xl text-primary-navy ml-2">
          Buy Bottles
        </Text>
      </View>
      <Text className="font-comfortaa text-sm text-neutral-gray mb-6">
        Purchase bottles to keep your subscription running
      </Text>

      {/* Bottles Input */}
      <View className="mb-4">
        <View className="flex-row items-center border-2 border-neutral-lightGray rounded-xl px-5 py-3">
          <TextInput
            className="flex-1 font-sofia-bold text-2xl text-primary-navy py-1"
            placeholder="Enter bottles"
            placeholderTextColor="#B3B3B3"
            keyboardType="numeric"
            value={bottles}
            onChangeText={(text) => setBottles(text.replace(/[^0-9]/g, ""))}
            editable={!isLoading}
          />
          <Text className="font-comfortaa text-lg text-neutral-gray ml-2">
            bottles
          </Text>
        </View>
        <Text className="font-comfortaa text-xs text-neutral-gray mt-1 ml-1">
          Min {minBottles} bottles @ {formatCurrency(bottlePrice)}/bottle
        </Text>
      </View>

      {/* Quick Amount Buttons */}
      <View className="flex-row flex-wrap gap-2 mb-6">
        {suggestedBottles.map((item) => (
          <TouchableOpacity
            key={item.value}
            className={`px-4 py-2.5 rounded-full border-2 ${
              bottles === item.value.toString()
                ? "border-primary-navy bg-primary-navy"
                : item.recommended
                  ? "border-primary-navy bg-primary-cream/10"
                  : "border-neutral-lightGray bg-white"
            } active:opacity-70`}
            onPress={() => setBottles(item.value.toString())}
            disabled={isLoading}
          >
            <Text
              className={`font-sofia-bold text-sm ${
                bottles === item.value.toString()
                  ? "text-white"
                  : item.recommended
                    ? "text-primary-navy"
                    : "text-neutral-darkGray"
              }`}
            >
              {item.label
                ? `${item.label} (${item.value})`
                : `${item.value} bottles`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Price Summary */}
      {bottlesNum >= minBottles && (
        <View className="bg-primary-cream/20 rounded-xl p-4 mb-4 border border-primary-cream/60">
          <View className="flex-row items-center justify-between">
            <Text className="font-comfortaa text-sm text-neutral-gray">
              {formatBottles(bottlesNum)} @ {formatCurrency(bottlePrice)} each
            </Text>
            <Text className="font-sofia-bold text-lg text-primary-navy">
              {formatCurrency(amount)}
            </Text>
          </View>
        </View>
      )}

      {/* Pay Button */}
      <Button
        title={
          isLoading
            ? "Opening Razorpay..."
            : `Pay ${bottlesNum >= minBottles ? formatCurrency(amount) : ""}`
        }
        onPress={handlePurchase}
        disabled={isLoading || !bottles || bottlesNum < minBottles}
        isLoading={isLoading}
        variant="navy"
        className="mb-4"
      />

      {/* Secure Payment Badge */}
      <View className="flex-row items-center justify-center py-2">
        <ShieldCheck size={14} color="#638C5F" strokeWidth={2} />
        <Text className="font-comfortaa text-xs text-functional-success ml-1.5">
          Secured by Razorpay
        </Text>
        <Text className="font-comfortaa text-xs text-neutral-gray ml-1">
          • UPI, Cards, Net Banking
        </Text>
      </View>
    </View>
  )
}
