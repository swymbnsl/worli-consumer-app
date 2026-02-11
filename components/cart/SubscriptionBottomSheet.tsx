import ProductImage from "@/components/common/ProductImage"
import Button from "@/components/ui/Button"
import { COLORS } from "@/constants/theme"
import {
  CartItem,
  CustomQuantities,
  SubscriptionFrequency,
} from "@/context/CartContext"
import { useCart } from "@/hooks/useCart"
import { Product } from "@/types/database.types"
import { formatCurrency } from "@/utils/formatters"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import { Calendar, Minus, Plus } from "lucide-react-native"
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Text, TouchableOpacity, View } from "react-native"

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SubscriptionBottomSheetRef {
  open: (product: Product, editItem?: CartItem) => void
  close: () => void
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FREQUENCY_TABS: { value: SubscriptionFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "custom", label: "Custom" },
  { value: "on_interval", label: "On Interval" },
  { value: "buy_once", label: "Buy Once" },
]

const INTERVAL_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 30]

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const getTomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}

const formatDateDisplay = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface SubscriptionBottomSheetProps {
  onEditSubscription?: (item: Omit<CartItem, "id">) => Promise<void>
}

const SubscriptionBottomSheet = forwardRef<
  SubscriptionBottomSheetRef,
  SubscriptionBottomSheetProps
>((props, ref) => {
  const bottomSheetRef = useRef<BottomSheet>(null)
  const { addItem, updateItem } = useCart()

  // State
  const [product, setProduct] = useState<Product | null>(null)
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("daily")
  const [quantity, setQuantity] = useState(1)
  const [startDate, setStartDate] = useState(getTomorrow())
  const [intervalDays, setIntervalDays] = useState(2)
  const [customQuantities, setCustomQuantities] = useState<CustomQuantities>({
    0: 1,
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 1,
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  const snapPoints = useMemo(() => ["70%", "92%"], [])

  // ─── Imperative Handle ───────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    open: (p: Product, editItem?: CartItem) => {
      setProduct(p)
      if (editItem) {
        setEditingItem(editItem)
        setFrequency(editItem.frequency)
        setQuantity(editItem.quantity)
        setStartDate(editItem.startDate)
        setIntervalDays(editItem.intervalDays || 2)
        setCustomQuantities(
          editItem.customQuantities || {
            0: 1,
            1: 1,
            2: 1,
            3: 1,
            4: 1,
            5: 1,
            6: 1,
          },
        )
      } else {
        setEditingItem(null)
        setFrequency("daily")
        setQuantity(1)
        setStartDate(getTomorrow())
        setIntervalDays(2)
        setCustomQuantities({
          0: 1,
          1: 1,
          2: 1,
          3: 1,
          4: 1,
          5: 1,
          6: 1,
        })
      }
      setShowDatePicker(false)
      bottomSheetRef.current?.snapToIndex(0)
    },
    close: () => {
      bottomSheetRef.current?.close()
    },
  }))

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleAddToCart = async () => {
    if (!product) return

    const payload: Omit<CartItem, "id"> = {
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      productImage: product.image_url,
      productVolume: product.volume,
      quantity,
      frequency,
      startDate,
      intervalDays: frequency === "on_interval" ? intervalDays : undefined,
      customQuantities: frequency === "custom" ? customQuantities : undefined,
    }

    // If editing an existing subscription via callback (not cart)
    if (props.onEditSubscription && editingItem) {
      await props.onEditSubscription(payload)
      bottomSheetRef.current?.close()
      return
    }

    // Otherwise, use cart context
    if (editingItem) {
      updateItem(editingItem.id, payload)
    } else {
      addItem(payload)
    }

    bottomSheetRef.current?.close()
  }

  const updateCustomQty = (day: number, delta: number) => {
    setCustomQuantities((prev) => {
      const current = prev[day] ?? 0
      const next = Math.max(0, Math.min(10, current + delta))
      return { ...prev, [day]: next }
    })
  }

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  )

  if (!product) return null

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: COLORS.neutral.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: COLORS.neutral.lightGray,
        width: 40,
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Product Info ──────────────────────────────────────── */}
        <View className="flex-row items-center mb-6">
          <ProductImage
            imageUrl={product.image_url}
            size="medium"
            containerClassName="mr-4"
          />
          <View className="flex-1">
            <Text className="font-sofia-bold text-lg text-neutral-black">
              {product.name}
            </Text>
            {product.volume && (
              <Text className="font-comfortaa text-sm text-neutral-gray">
                {product.volume}
              </Text>
            )}
            <Text className="font-sofia-bold text-base text-neutral-black mt-0.5">
              {formatCurrency(product.price)}
            </Text>
          </View>
        </View>

        {/* ─── Frequency Question ───────────────────────────────── */}
        <Text className="font-sofia-bold text-base text-neutral-black mb-4">
          How often do you want to receive this item?
        </Text>

        {/* Frequency Tabs (horizontal pills) */}
        <View className="flex-row flex-wrap mb-6 gap-2">
          {FREQUENCY_TABS.map((tab) => {
            const isSelected = frequency === tab.value
            return (
              <TouchableOpacity
                key={tab.value}
                className={`px-5 py-2.5 rounded-full border ${
                  isSelected
                    ? "bg-primary-navy border-primary-navy"
                    : "bg-white border-neutral-lightGray"
                }`}
                onPress={() => setFrequency(tab.value)}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-sofia-bold text-sm ${
                    isSelected ? "text-white" : "text-neutral-black"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* ─── On Interval: Interval selector ───────────────────── */}
        {frequency === "on_interval" && (
          <View className="mb-6">
            <Text className="font-sofia-bold text-base text-neutral-black mb-4">
              Repeat Once In
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {INTERVAL_OPTIONS.map((days) => {
                const isSelected = intervalDays === days
                return (
                  <TouchableOpacity
                    key={days}
                    className={`px-4 py-2 rounded-full border ${
                      isSelected
                        ? "bg-primary-navy border-primary-navy"
                        : "bg-white border-neutral-lightGray"
                    }`}
                    onPress={() => setIntervalDays(days)}
                  >
                    <Text
                      className={`font-sofia-bold text-sm ${
                        isSelected ? "text-white" : "text-neutral-black"
                      }`}
                    >
                      {days} Days
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ─── Custom: Per-day quantity selectors ────────────────── */}
        {frequency === "custom" && (
          <View className="mb-6">
            <Text className="font-sofia-bold text-base text-neutral-black mb-4">
              Quantity
            </Text>
            <View className="flex-row justify-between">
              {WEEKDAYS.map((day, idx) => {
                const qty = customQuantities[idx] ?? 0
                return (
                  <View
                    key={day}
                    className="items-center border border-secondary-skyBlue rounded-lg overflow-hidden"
                    style={{ width: "13%" }}
                  >
                    {/* Plus */}
                    <TouchableOpacity
                      className="w-full items-center py-1.5 border-b border-secondary-skyBlue"
                      onPress={() => updateCustomQty(idx, 1)}
                    >
                      <Plus
                        size={13}
                        color={COLORS.secondary.skyBlue}
                        strokeWidth={2.5}
                      />
                    </TouchableOpacity>

                    {/* Quantity */}
                    <Text className="font-sofia-bold text-lg text-neutral-black py-1">
                      {qty}
                    </Text>

                    {/* Day name */}
                    <Text className="font-comfortaa text-[10px] text-neutral-gray pb-1">
                      {day}
                    </Text>

                    {/* Minus */}
                    <TouchableOpacity
                      className="w-full items-center py-1.5 border-t border-secondary-skyBlue"
                      onPress={() => updateCustomQty(idx, -1)}
                    >
                      <Minus
                        size={13}
                        color={COLORS.secondary.skyBlue}
                        strokeWidth={2.5}
                      />
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* ─── Date & Quantity Row ───────────────────────────────── */}
        <View className="flex-row items-end mb-6">
          {/* Date */}
          <View className={frequency === "custom" ? "flex-1" : "flex-1 mr-8"}>
            <Text className="font-sofia-bold text-base text-neutral-black mb-3">
              {frequency === "buy_once"
                ? "Delivery Date"
                : "Delivery Start Date"}
            </Text>
            <TouchableOpacity
              className="flex-row items-center border border-neutral-lightGray rounded-lg px-3 py-3"
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={18} color={COLORS.neutral.gray} />
              <Text className="font-comfortaa-bold text-sm text-neutral-black ml-2">
                {formatDateDisplay(startDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quantity (not shown for custom mode — it's per-day above) */}
          {frequency !== "custom" && (
            <View>
              <Text className="font-sofia-bold text-base text-neutral-black mb-3">
                Quantity
              </Text>
              <View className="flex-row items-center">
                <TouchableOpacity
                  className="w-10 h-10 rounded-lg bg-primary-navy items-center justify-center"
                  onPress={() => quantity > 1 && setQuantity(quantity - 1)}
                >
                  <Minus size={18} color={COLORS.neutral.white} />
                </TouchableOpacity>
                <Text className="mx-4 font-sofia-bold text-xl text-neutral-black min-w-[24px] text-center">
                  {quantity}
                </Text>
                <TouchableOpacity
                  className="w-10 h-10 rounded-lg bg-primary-navy items-center justify-center"
                  onPress={() => quantity < 10 && setQuantity(quantity + 1)}
                >
                  <Plus size={18} color={COLORS.neutral.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Date Picker (native modal) */}
        {showDatePicker && (
          <View className="mb-4">
            {/* @ts-ignore - DateTimePicker from @react-native-community */}
            <DateTimePickerFallback
              startDate={startDate}
              onSelect={(date: string) => {
                setStartDate(date)
                setShowDatePicker(false)
              }}
              onClose={() => setShowDatePicker(false)}
            />
          </View>
        )}

        {/* ─── Info Text ────────────────────────────────────────── */}
        <Text className="font-comfortaa text-sm text-neutral-darkGray mb-6">
          Order by <Text className="font-sofia-bold">9 PM</Text> for delivery{" "}
          <Text className="font-sofia-bold">next day</Text> by{" "}
          <Text className="font-sofia-bold">07:00 AM</Text>
        </Text>

        {/* ─── Add To Cart Button ───────────────────────────────── */}
        <Button
          title={
            props.onEditSubscription && editingItem
              ? "Update Subscription"
              : editingItem
                ? "Update Cart"
                : "Add To Cart"
          }
          onPress={handleAddToCart}
          variant="navy"
          size="large"
        />
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

SubscriptionBottomSheet.displayName = "SubscriptionBottomSheet"

// ─── Inline Date Picker (scrollable date grid) ────────────────────────────────

function DateTimePickerFallback({
  startDate,
  onSelect,
  onClose,
}: {
  startDate: string
  onSelect: (date: string) => void
  onClose: () => void
}) {
  const days: string[] = useMemo(() => {
    const arr: string[] = []
    for (let i = 1; i <= 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      arr.push(d.toISOString().split("T")[0])
    }
    return arr
  }, [])

  return (
    <View className="bg-neutral-lightCream rounded-xl p-3">
      <View className="flex-row flex-wrap gap-2">
        {days.map((date) => {
          const isSelected = startDate === date
          const d = new Date(date + "T00:00:00")
          const dayNum = d.getDate()
          const dayName = d.toLocaleDateString("en-IN", { weekday: "short" })
          const month = d.toLocaleDateString("en-IN", { month: "short" })

          return (
            <TouchableOpacity
              key={date}
              className={`items-center py-2 px-2 rounded-lg border ${
                isSelected
                  ? "border-primary-navy bg-primary-navy"
                  : "border-neutral-lightGray bg-white"
              }`}
              style={{ width: "18%" }}
              onPress={() => onSelect(date)}
            >
              <Text
                className={`font-comfortaa text-[10px] ${
                  isSelected ? "text-white" : "text-neutral-gray"
                }`}
              >
                {dayName}
              </Text>
              <Text
                className={`font-sofia-bold text-base ${
                  isSelected ? "text-white" : "text-neutral-black"
                }`}
              >
                {dayNum}
              </Text>
              <Text
                className={`font-comfortaa text-[10px] ${
                  isSelected ? "text-white" : "text-neutral-gray"
                }`}
              >
                {month}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <TouchableOpacity className="mt-3 items-center py-2" onPress={onClose}>
        <Text className="font-sofia-bold text-sm text-neutral-gray">Close</Text>
      </TouchableOpacity>
    </View>
  )
}

export default SubscriptionBottomSheet
