import DiscountCodeInput from "@/components/cart/DiscountCodeInput"
import Button from "@/components/ui/Button"
import { showErrorToast } from "@/components/ui/Toast"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { RazorpayError } from "@/lib/razorpay-service"
import {
    calculateMonthlySubscriptionCost,
    DiscountResult,
    fetchAppSetting,
    getPendingReferralBonusAmount,
    validateDiscountCode,
} from "@/lib/supabase-service"
import { formatCurrency } from "@/utils/formatters"
import {
    CheckCircle,
    CreditCard,
    Gift,
    ShieldCheck,
    XCircle,
} from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"

type PaymentStatus = "idle" | "processing" | "success" | "failed"

export default function RechargeModal() {
  const { user } = useAuth()
  const { rechargeWithRazorpay } = useWallet()
  const [amount, setAmount] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountResult | undefined>()
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | undefined>()
  const [discountBaseAmount, setDiscountBaseAmount] = useState<number | undefined>()
  const [referralBonusAmount, setReferralBonusAmount] = useState<number>(0)
  
  const [minRecharge, setMinRecharge] = useState<number>(350)
  const [suggestedAmounts, setSuggestedAmounts] = useState<{value: number, recommended: boolean, label?: string}[]>([
    { value: 1500, recommended: false },
    { value: 2000, recommended: true },
    { value: 2500, recommended: false },
  ])

  useEffect(() => {
    async function loadConfig() {
      try {
        const minValStr = await fetchAppSetting('min_wallet_recharge')
        if (minValStr) {
          const val = parseInt(minValStr, 10)
          if (!isNaN(val) && val > 0) setMinRecharge(Math.max(350, val))
        }
      } catch (error) {
        console.log("Error loading config", error)
      }
    }
    loadConfig()
  }, [])

  // Check if user has referral bonus to show
  useEffect(() => {
    async function checkReferralBonus() {
      if (!user?.id || !user?.referred_by) {
        setReferralBonusAmount(0)
        return
      }

      try {
        const reward = await getPendingReferralBonusAmount(user.id)
        setReferralBonusAmount(reward > 0 ? reward : 0)
      } catch (error) {
        console.error("Error fetching referral reward", error)
        setReferralBonusAmount(0)
      }
    }

    checkReferralBonus()
  }, [user?.id, user?.referred_by])

  useEffect(() => {
    async function loadSuggestions() {
      if (!user) return
      try {
        const monthlyCost = await calculateMonthlySubscriptionCost(user.id)
        if (monthlyCost > 0) {
          if (monthlyCost < 1500) {
            setSuggestedAmounts([
              { value: 1500, recommended: false },
              { value: 2000, recommended: true },
              { value: 2500, recommended: false },
            ])
          } else {
            setSuggestedAmounts([
              { value: monthlyCost, recommended: true, label: "1 Month" },
              { value: monthlyCost * 3, recommended: false, label: "3 Months" },
              { value: monthlyCost * 6, recommended: false, label: "6 Months" },
            ])
          }
        }
      } catch (error) {
        console.error("Error setting suggestions", error)
      }
    }
    loadSuggestions()
  }, [user])

  const isLoading = paymentStatus === "processing"
  const amountNum = parseInt(amount) || 0

  useEffect(() => {
    if (!appliedDiscount || !discountBaseAmount) return
    if (amountNum !== discountBaseAmount) {
      setAppliedDiscount(undefined)
      setAppliedDiscountCode(undefined)
      setDiscountBaseAmount(undefined)
    }
  }, [amountNum, appliedDiscount, discountBaseAmount])

  const discountAmount = appliedDiscount?.discount_amount ?? 0
  const finalPayableAmount = Math.max(0, amountNum - discountAmount)

  const handleRecharge = async () => {
    if (!amountNum || amountNum <= 0) {
      showErrorToast("Invalid Amount", "Please enter a valid amount")
      return
    }

    if (amountNum < minRecharge) {
      showErrorToast("Minimum Amount", `Minimum recharge amount is ₹${minRecharge}`)
      return
    }

    if (amountNum > 50000) {
      showErrorToast("Maximum Amount", "Maximum recharge amount is ₹50,000")
      return
    }

    if (finalPayableAmount < minRecharge) {
      showErrorToast(
        "Minimum Payable Amount",
        `Final payable amount after discount must be at least ₹${minRecharge}`,
      )
      return
    }

    setPaymentStatus("processing")
    try {
      const result = await rechargeWithRazorpay(finalPayableAmount)
      setPaymentStatus("success")
      setLastPaymentId(result.razorpay_payment_id)

      // Reset after showing success briefly
      setTimeout(() => {
        setPaymentStatus("idle")
        setAmount("")
        setAppliedDiscount(undefined)
        setAppliedDiscountCode(undefined)
        setDiscountBaseAmount(undefined)
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

      {/* Referral Bonus Notice */}
      {referralBonusAmount > 0 && (
        <View className="bg-secondary-skyBlue/10 border border-secondary-skyBlue/30 rounded-xl p-3 mb-5 flex-row items-start gap-3">
          <View className="w-6 h-6 rounded-full bg-secondary-skyBlue/20 items-center justify-center mt-0.5 shrink-0">
            <Gift size={14} color="#4A90E2" />
          </View>
          <View className="flex-1">
            <Text className="font-sofia-bold text-xs text-secondary-skyBlue mb-0.5">
              Referral Bonus!
            </Text>
            <Text className="font-comfortaa text-xs text-secondary-skyBlue">
              Complete this recharge and get {formatCurrency(referralBonusAmount)} bonus for you and your referrer.
            </Text>
          </View>
        </View>
      )}

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
          Min ₹{minRecharge} • Max ₹50,000
        </Text>
      </View>

      {/* Quick Amount Buttons */}
      <View className="flex-row flex-wrap gap-2 mb-6">
        {suggestedAmounts.map((item) => (
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
              {item.label ? `${item.label} (${formatCurrency(item.value)})` : formatCurrency(item.value)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Discount Code */}
      <DiscountCodeInput
        orderAmount={amountNum}
        applicableTo="wallet_recharge"
        userId={user?.id ?? ""}
        disabled={amountNum < minRecharge}
        onApply={(result, code) => {
          setAppliedDiscount(result)
          setAppliedDiscountCode(code)
          setDiscountBaseAmount(amountNum)
        }}
        onRemove={() => {
          setAppliedDiscount(undefined)
          setAppliedDiscountCode(undefined)
          setDiscountBaseAmount(undefined)
        }}
        appliedCode={appliedDiscountCode}
        appliedResult={appliedDiscount}
        onValidate={validateDiscountCode}
      />

      {amountNum < minRecharge && (
        <Text className="font-comfortaa text-xs text-neutral-gray -mt-2 mb-4 ml-1">
          Enter at least ₹{minRecharge} to enable discount code
        </Text>
      )}

      {appliedDiscount && discountAmount > 0 && (
        <View className="bg-primary-cream/20 rounded-xl p-3 mb-4 border border-primary-cream/60">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-comfortaa text-xs text-neutral-gray">Recharge Amount</Text>
            <Text className="font-comfortaa text-xs text-neutral-gray line-through">
              {formatCurrency(amountNum)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-comfortaa text-xs text-functional-success">
              Discount ({appliedDiscountCode})
            </Text>
            <Text className="font-sofia-bold text-xs text-functional-success">
              -{formatCurrency(discountAmount)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-sofia-bold text-sm text-primary-navy">Payable</Text>
            <Text className="font-sofia-bold text-base text-primary-navy">
              {formatCurrency(finalPayableAmount)}
            </Text>
          </View>
        </View>
      )}

      {/* Pay Button */}
      <Button
        title={
          isLoading
            ? "Opening Razorpay..."
            : `Pay ${amount ? formatCurrency(finalPayableAmount) : ""}`
        }
        onPress={handleRecharge}
        disabled={isLoading || !amount || amountNum < minRecharge || finalPayableAmount < minRecharge}
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
