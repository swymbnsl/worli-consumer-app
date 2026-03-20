import { COLORS } from "@/constants/theme"
import { DiscountError, DiscountResult } from "@/lib/supabase-service"
import { formatCurrency } from "@/utils/formatters"
import { CheckCircle, Tag, X } from "lucide-react-native"
import React, { useState } from "react"
import {
    ActivityIndicator,
    TextInput as RNTextInput,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

interface DiscountCodeInputProps {
  orderAmount: number
  applicableTo?: string
  userId: string
  onApply: (result: DiscountResult, code: string) => void
  onRemove: () => void
  appliedCode?: string
  appliedResult?: DiscountResult
  disabled?: boolean
  onValidate: (
    code: string,
    userId: string,
    orderAmount: number,
    applicableTo: string,
  ) => Promise<DiscountResult | DiscountError>
}

export default function DiscountCodeInput({
  orderAmount,
  applicableTo = "all",
  userId,
  onApply,
  onRemove,
  appliedCode,
  appliedResult,
  disabled = false,
  onValidate,
}: DiscountCodeInputProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isApplied = !!appliedResult

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError("Please enter a discount code.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const result = await onValidate(trimmed, userId, orderAmount, applicableTo)
      if (result.valid) {
        onApply(result as DiscountResult, trimmed)
        setCode("")
      } else {
        setError((result as { valid: false; error: string }).error)
      }
    } catch {
      setError("Could not validate code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    setCode("")
    setError(null)
    onRemove()
  }

  // ── Applied state ──────────────────────────────────────────────────
  if (isApplied && appliedResult && appliedCode) {
    return (
      <View
        className="bg-white rounded-2xl p-4 mb-4 border"
        style={{ borderColor: COLORS.functional.success }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <CheckCircle size={18} color={COLORS.functional.success} />
            <View className="ml-3 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-sofia-bold text-sm text-functional-success">
                  {appliedCode}
                </Text>
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: COLORS.functional.success + "20" }}
                >
                  <Text
                    className="font-comfortaa text-xs"
                    style={{ color: COLORS.functional.success }}
                  >
                    Applied
                  </Text>
                </View>
              </View>
              <Text className="font-comfortaa text-xs text-neutral-gray mt-0.5">
                You save{" "}
                <Text className="font-sofia-bold text-functional-success">
                  {formatCurrency(appliedResult.discount_amount)}
                </Text>
                {appliedResult.discount_type === "percentage"
                  ? ` (${appliedResult.discount_value}% off)`
                  : ""}
              </Text>

            </View>
          </View>
          <TouchableOpacity
            onPress={handleRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color={COLORS.neutral.gray} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Input state ────────────────────────────────────────────────────
  return (
    <View
      className="rounded-2xl p-4 mb-4 border border-neutral-lightGray"
      style={{
        backgroundColor: disabled ? COLORS.neutral.lightGray + "40" : COLORS.neutral.white,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <View className="flex-row items-center mb-1">
        <Tag size={16} color={COLORS.primary.navy} />
        <Text className="font-sofia-bold text-sm text-primary-navy ml-2">
          Discount Code
        </Text>
      </View>

      <View className="flex-row items-center mt-2 gap-2">
        <RNTextInput
          value={code}
          onChangeText={(t) => {
            setCode(t.toUpperCase())
            if (error) setError(null)
          }}
          placeholder="Enter code"
          placeholderTextColor={COLORS.neutral.gray}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleApply}
          className="flex-1 border border-neutral-lightGray rounded-xl px-3 py-3 font-sofia-bold text-sm text-primary-navy"
          style={{ letterSpacing: 1.5 }}
          editable={!loading && !disabled}
        />
        <TouchableOpacity
          onPress={handleApply}
          disabled={loading || disabled || !code.trim()}
          className="rounded-xl px-4 py-3 items-center justify-center"
          style={{
            backgroundColor:
              code.trim() && !loading && !disabled
                ? COLORS.primary.navy
                : COLORS.neutral.lightGray,
            minWidth: 76,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.neutral.white} />
          ) : (
            <Text
              className="font-sofia-bold text-sm"
              style={{
                color:
                  code.trim() ? COLORS.neutral.white : COLORS.neutral.gray,
              }}
            >
              Apply
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <Text className="font-comfortaa text-xs text-functional-error mt-2 ml-1">
          {error}
        </Text>
      ) : null}
    </View>
  )
}
