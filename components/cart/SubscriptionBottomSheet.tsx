import ProductImage from "@/components/common/ProductImage"
import Button from "@/components/ui/Button"
import { ConfirmModal } from "@/components/ui/Modal"
import { COLORS } from "@/constants/theme"
import {
  CartItem,
  CustomQuantities,
  SubscriptionFrequency,
} from "@/context/CartContext"
import { useAuth } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { supabase } from "@/lib/supabase"
import { Product } from "@/types/database.types"
import { formatCurrency } from "@/utils/formatters"
import {
  getDayAfterTomorrowDateNtp,
  getNtpNow,
  getTomorrowDateNtp,
  getTomorrowWeekdayNtp,
  isPastCutoff,
  isTomorrowNtp,
} from "@/utils/ntpTime"
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import { Calendar, Clock, Minus, Pencil, Plus } from "lucide-react-native"
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

const DELIVERY_TIME_SLOTS = [
  { value: "06:00-07:00", label: "6 AM - 7 AM" },
  { value: "07:00-08:00", label: "7 AM - 8 AM" },
  { value: "08:00-09:00", label: "8 AM - 9 AM" },
  { value: "09:00-10:00", label: "9 AM - 10 AM" },
  { value: "10:00-11:00", label: "10 AM - 11 AM" },
  { value: "11:00-12:00", label: "11 AM - 12 PM" },
  { value: "12:00-13:00", label: "12 PM - 1 PM" },
  { value: "13:00-14:00", label: "1 PM - 2 PM" },
  { value: "14:00-15:00", label: "2 PM - 3 PM" },
  { value: "15:00-16:00", label: "3 PM - 4 PM" },
  { value: "16:00-17:00", label: "4 PM - 5 PM" },
  { value: "17:00-18:00", label: "5 PM - 6 PM" },
]

const getDefaultStartDate = (freq: SubscriptionFrequency = "daily") => {
  // For buy_once, if past cutoff, skip tomorrow and default to day-after-tomorrow
  if (freq === "buy_once" && isPastCutoff()) {
    return getDayAfterTomorrowDateNtp()
  }
  return getTomorrowDateNtp()
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
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const { addItem, updateItem } = useCart()
  const { user } = useAuth()

  // State
  const [product, setProduct] = useState<Product | null>(null)
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("daily")
  const [quantity, setQuantity] = useState(1)
  const [startDate, setStartDate] = useState(getDefaultStartDate())
  const [showCutoffModal, setShowCutoffModal] = useState(false)
  const [pendingCartPayload, setPendingCartPayload] = useState<Omit<CartItem, "id"> | null>(null)
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
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [preferredDeliveryTime, setPreferredDeliveryTime] = useState<string>(
    DELIVERY_TIME_SLOTS[0].value,
  )

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
        setShowCutoffModal(false)
        setPendingCartPayload(null)
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
        setPreferredDeliveryTime(
          editItem.preferredDeliveryTime || DELIVERY_TIME_SLOTS[0].value,
        )
      } else {
        setEditingItem(null)
        setFrequency("daily")
        setQuantity(1)
        setStartDate(getDefaultStartDate("daily"))
        setShowCutoffModal(false)
        setPendingCartPayload(null)
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
        setPreferredDeliveryTime(DELIVERY_TIME_SLOTS[0].value)
      }
      setShowDatePicker(false)
      setShowTimePicker(false)
      bottomSheetRef.current?.present()
    },
    close: () => {
      bottomSheetRef.current?.dismiss()
    },
  }))

  // ─── Handlers ────────────────────────────────────────────────────────

  // ─── Cutoff check helper ─────────────────────────────────────────────

  /**
   * Determines if the current subscription config triggers the 7 PM cutoff.
   * Returns true if user needs to be warned (i.e., tomorrow's delivery will be missed).
   */
  const shouldShowCutoffWarning = (freq: SubscriptionFrequency, start: string): boolean => {
    if (!isPastCutoff()) return false
    if (!isTomorrowNtp(start)) return false

    switch (freq) {
      case "buy_once":
        // buy_once should be blocked at the UI level, but this is a safety net
        return true
      case "daily":
      case "on_interval":
        return true
      case "custom": {
        // Only warn if tomorrow's weekday has quantity > 0
        const tomorrowWeekday = getTomorrowWeekdayNtp()
        const tomorrowQty = customQuantities[tomorrowWeekday] ?? 0
        return tomorrowQty > 0
      }
      default:
        return false
    }
  }

  // ─── Finalize add-to-cart (after cutoff check passes) ───────────────

  const finalizeAddToCart = async (payload: Omit<CartItem, "id">) => {
    // Save preferred delivery time to Supabase delivery_preferences table
    if (user?.id) {
      try {
        const isValidSlot = DELIVERY_TIME_SLOTS.some(
          (slot) => slot.value === payload.preferredDeliveryTime,
        )

        if (!isValidSlot) {
          console.error("Invalid delivery time slot selected")
        } else {
          const { error } = await supabase
            .from("delivery_preferences")
            .upsert(
              {
                user_id: user.id,
                preferred_delivery_time: payload.preferredDeliveryTime!,
              },
              { onConflict: "user_id" },
            )

          if (error) {
            console.error("Failed to save delivery preference:", error)
          }
        }
      } catch (error) {
        console.error("Failed to save delivery preference:", error)
      }
    }

    // If editing an existing subscription via callback (not cart)
    if (props.onEditSubscription && editingItem) {
      await props.onEditSubscription(payload)
      bottomSheetRef.current?.dismiss()
      return
    }

    // Otherwise, use cart context
    if (editingItem) {
      updateItem(editingItem.id, payload)
    } else {
      addItem(payload)
    }

    bottomSheetRef.current?.dismiss()
  }

  // ─── Add to cart with cutoff interception ───────────────────────────

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
      preferredDeliveryTime,
    }

    // Check for 7 PM cutoff — show confirmation if needed
    if (shouldShowCutoffWarning(frequency, startDate)) {
      setPendingCartPayload(payload)
      setShowCutoffModal(true)
      return
    }

    await finalizeAddToCart(payload)
  }

  const handleCutoffConfirm = async () => {
    setShowCutoffModal(false)
    if (pendingCartPayload) {
      await finalizeAddToCart(pendingCartPayload)
      setPendingCartPayload(null)
    }
  }

  const handleCutoffCancel = () => {
    setShowCutoffModal(false)
    setPendingCartPayload(null)
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

  const handleDismiss = useCallback(() => {
    setProduct(null)
    setEditingItem(null)
  }, [])

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
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
      android_keyboardInputMode="adjustResize"
      onDismiss={handleDismiss}
    >
      {product && (
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
          
          <View className="mb-6">
            <Text className="font-sofia-bold text-base text-neutral-black mb-3">
              Preferred Delivery Time Slot
            </Text>
            <TouchableOpacity
              className="flex-row items-center justify-between border border-neutral-lightGray rounded-lg px-3 py-3"
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center flex-1">
                <Clock size={18} color={COLORS.neutral.gray} />
                <Text className="font-comfortaa-bold text-sm text-neutral-black ml-2">
                  {DELIVERY_TIME_SLOTS.find(
                    (s) => s.value === preferredDeliveryTime,
                  )?.label || "Select Time"}
                </Text>
              </View>
              <Pencil size={16} color={COLORS.neutral.gray} />
            </TouchableOpacity>
          </View>

          {/* Time Picker Modal */}
          {showTimePicker && (
            <View className="mb-4">
              <TimeSlotPicker
                selectedSlot={preferredDeliveryTime}
                onSelect={(slot: string) => {
                  setPreferredDeliveryTime(slot)
                  setShowTimePicker(false)
                }}
                onClose={() => setShowTimePicker(false)}
              />
            </View>
          )}

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
                  onPress={() => {
                    setFrequency(tab.value)
                    // Update start date based on new frequency's cutoff rules
                    setStartDate(getDefaultStartDate(tab.value))
                  }}
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
                frequency={frequency}
                onSelect={(date: string) => {
                  setStartDate(date)
                  setShowDatePicker(false)
                }}
                onClose={() => setShowDatePicker(false)}
              />
            </View>
          )}

          {/* ─── Add To Cart Button ───────────────────────────────── */}
          <Button
            title={
              props.onEditSubscription && editingItem
                ? "Update Subscription"
                : editingItem
                  ? "Update Cart"
                  : "Add to Cart"
            }
            onPress={handleAddToCart}
            variant="navy"
            size="medium"
          />

          {/* 7 PM Cutoff Confirmation Modal */}
```tsx
          <ConfirmModal
            visible={showCutoffModal}
            onClose={handleCutoffCancel}
            onConfirm={handleCutoffConfirm}
            title="Heads up!"
            description="It's past our 7 PM cutoff for tomorrow's delivery, so your first delivery will arrive on the next available date. Is that okay?"
            confirmText="Continue"
            cancelText="Cancel"
          />
```
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  )
})

SubscriptionBottomSheet.displayName = "SubscriptionBottomSheet"

// ─── Time Slot Picker (scrollable time slot grid) ─────────────────────────────

function TimeSlotPicker({
  selectedSlot,
  onSelect,
  onClose,
}: {
  selectedSlot: string
  onSelect: (slot: string) => void
  onClose: () => void
}) {
  return (
    <View className="bg-neutral-lightCream rounded-xl p-4">
      <Text className="font-sofia-bold text-base text-neutral-black mb-4 text-center">
        Select Delivery Time
      </Text>
      <View className="flex-row flex-wrap gap-2.5">
        {DELIVERY_TIME_SLOTS.map((slot) => {
          const isSelected = selectedSlot === slot.value
          return (
            <TouchableOpacity
              key={slot.value}
              className={`items-center justify-center py-2.5 px-3 rounded-lg border ${
                isSelected
                  ? "border-primary-navy bg-primary-navy"
                  : "border-neutral-lightGray bg-white"
              }`}
              style={{ width: "48%" }}
              onPress={() => onSelect(slot.value)}
              activeOpacity={0.7}
            >
              <Text
                className={`font-comfortaa text-xs ${
                  isSelected ? "text-white" : "text-neutral-black"
                }`}
              >
                {slot.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <TouchableOpacity
        className="mt-4 items-center py-2.5 bg-primary-navy rounded-lg"
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Text className="font-sofia-bold text-sm text-white">Done</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Inline Date Picker (scrollable date grid) ────────────────────────────────

function DateTimePickerFallback({
  startDate,
  frequency,
  onSelect,
  onClose,
}: {
  startDate: string
  frequency: SubscriptionFrequency
  onSelect: (date: string) => void
  onClose: () => void
}) {
  const pastCutoff = isPastCutoff()
  const tomorrowStr = getTomorrowDateNtp()

  const days: string[] = useMemo(() => {
    const arr: string[] = []
    const now = getNtpNow()
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now)
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

          // Disable tomorrow for buy_once when past 7 PM cutoff
          const isTomorrowDisabled =
            frequency === "buy_once" && pastCutoff && date === tomorrowStr

          return (
            <TouchableOpacity
              key={date}
              className={`items-center py-2 px-2 rounded-lg border ${
                isTomorrowDisabled
                  ? "border-neutral-lightGray bg-neutral-lightGray/50 opacity-40"
                  : isSelected
                    ? "border-primary-navy bg-primary-navy"
                    : "border-neutral-lightGray bg-white"
              }`}
              style={{ width: "18%" }}
              onPress={() => !isTomorrowDisabled && onSelect(date)}
              activeOpacity={isTomorrowDisabled ? 1 : 0.7}
              disabled={isTomorrowDisabled}
            >
              <Text
                className={`font-comfortaa text-[10px] ${
                  isTomorrowDisabled
                    ? "text-neutral-gray/60"
                    : isSelected
                      ? "text-white"
                      : "text-neutral-gray"
                }`}
              >
                {dayName}
              </Text>
              <Text
                className={`font-sofia-bold text-base ${
                  isTomorrowDisabled
                    ? "text-neutral-gray/60"
                    : isSelected
                      ? "text-white"
                      : "text-neutral-black"
                }`}
              >
                {dayNum}
              </Text>
              <Text
                className={`font-comfortaa text-[10px] ${
                  isTomorrowDisabled
                    ? "text-neutral-gray/60"
                    : isSelected
                      ? "text-white"
                      : "text-neutral-gray"
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
