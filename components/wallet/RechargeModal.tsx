import Button from "@/components/ui/Button"
import { showErrorToast } from "@/components/ui/Toast"
import { useWallet } from "@/hooks/useWallet"
import { RazorpayError } from "@/lib/razorpay-service"
import { formatCurrency } from "@/utils/formatters"
import {
  CheckCircle,
  CreditCard,
  ShieldCheck,
  XCircle,
} from "lucide-react-native"
import React, { useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"

type PaymentStatus = "idle" | "processing" | "success" | "failed"

export default function RechargeModal() {
  const { rechargeWithRazorpay } = useWallet()
  const [amount, setAmount] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)

  const quickAmounts = [
    { value: 500, recommended: false },
    { value: 1000, recommended: false },
    { value: 2000, recommended: true },
    { value: 3000, recommended: false },
    { value: 5000, recommended: false },
  ]

  const isLoading = paymentStatus === "processing"

  const handleRecharge = async () => {
    const amountNum = parseInt(amount)

    if (!amountNum || amountNum <= 0) {
      showErrorToast("Invalid Amount", "Please enter a valid amount")
      return
    }

    if (amountNum < 100) {
      showErrorToast("Minimum Amount", "Minimum recharge amount is ₹100")
      return
    }

    if (amountNum > 50000) {
      showErrorToast("Maximum Amount", "Maximum recharge amount is ₹50,000")
      return
    }

    setPaymentStatus("processing")
    try {
      const result = await rechargeWithRazorpay(amountNum)
      setPaymentStatus("success")
      setLastPaymentId(result.razorpay_payment_id)

      // Reset after showing success briefly
      setTimeout(() => {
        setPaymentStatus("idle")
        setAmount("")
        setLastPaymentId(null)
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
        rzpError?.description || "Something went wrong. Please try again.",
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
            {formatCurrency(parseInt(amount))} has been added to your wallet
          </Text>
          {lastPaymentId && (
            <Text className="font-comfortaa text-xs text-neutral-gray">
              Payment ID: {lastPaymentId}
            </Text>
          )}
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
        <CreditCard size={22} color="#101B53" strokeWidth={2} />
        <Text className="font-sofia-bold text-2xl text-primary-navy ml-2">
          Recharge
        </Text>
      </View>
      <Text className="font-comfortaa text-sm text-neutral-gray mb-6">
        Add money to your wallet via Razorpay
      </Text>

      {/* Amount Input */}
      <View className="mb-4">
        <View className="flex-row items-center border-2 border-neutral-lightGray rounded-xl px-5 py-3">
          <Text className="font-sofia-bold text-2xl text-primary-navy mr-1">
            ₹
          </Text>
          <TextInput
            className="flex-1 font-sofia-bold text-2xl text-primary-navy py-1"
            placeholder="Enter amount"
            placeholderTextColor="#B3B3B3"
            keyboardType="numeric"
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
            editable={!isLoading}
          />
        </View>
        <Text className="font-comfortaa text-xs text-neutral-gray mt-1 ml-1">
          Min ₹100 • Max ₹50,000
        </Text>
      </View>

      {/* Quick Amount Buttons */}
      <View className="flex-row flex-wrap gap-2 mb-6">
        {quickAmounts.map((item) => (
          <TouchableOpacity
            key={item.value}
            className={`px-4 py-2.5 rounded-full border-2 ${
              amount === item.value.toString()
                ? "border-primary-navy bg-primary-navy"
                : item.recommended
                  ? "border-primary-navy bg-primary-cream/10"
                  : "border-neutral-lightGray bg-white"
            } active:opacity-70`}
            onPress={() => setAmount(item.value.toString())}
            disabled={isLoading}
          >
            <Text
              className={`font-sofia-bold text-sm ${
                amount === item.value.toString()
                  ? "text-white"
                  : item.recommended
                    ? "text-primary-navy"
                    : "text-neutral-darkGray"
              }`}
            >
              {formatCurrency(item.value)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pay Button */}
      <Button
        title={
          isLoading
            ? "Opening Razorpay..."
            : `Pay ${amount ? formatCurrency(parseInt(amount)) : ""}`
        }
        onPress={handleRecharge}
        disabled={isLoading || !amount || parseInt(amount) < 100}
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
