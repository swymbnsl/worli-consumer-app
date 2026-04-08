import ProductImage from "@/components/common/ProductImage"
import Button from "@/components/ui/Button"
import { ConfirmModal } from "@/components/ui/Modal"
import { showErrorToast } from "@/components/ui/Toast"
import { COLORS } from "@/constants/theme"
import {
  CartItem,
  CustomQuantities,
  SubscriptionFrequency,
} from "@/stores/cart-store"
import { useAuth } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { checkDuplicateSubscription, fetchUserAddresses, fetchDurationDiscounts } from "@/lib/supabase-service"
import { Address, Product, Subscription } from "@/types/database.types"
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
import { Calendar, Check, ChevronDown, Clock, MapPin, Minus, Plus } from "lucide-react-native"
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Text, TouchableOpacity, View } from "react-native"

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SubscriptionBottomSheetRef {
  open: (product: Product, editItem?: CartItem, existingSubscription?: Subscription) => void
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

// Calculate total bottles for a subscription
export const calculateTotalBottles = (
  frequency: SubscriptionFrequency,
  quantity: number,
  durationMonths: number,
  intervalDays?: number,
  customQuantities?: CustomQuantities,
): number => {
  if (frequency === "buy_once") {
    return quantity
  }
  
  if (frequency === "daily") {
    return quantity * 30 * durationMonths
  }
  
  if (frequency === "custom" && customQuantities) {
    const weeklyTotal = Object.values(customQuantities).reduce((sum, qty) => sum + qty, 0)
    // ~4.3 weeks per month, rounded to 4 for simplicity
    return weeklyTotal * 4 * durationMonths
  }
  
  if (frequency === "on_interval" && intervalDays) {
    const deliveriesPerMonth = Math.floor(30 / intervalDays)
    return quantity * deliveriesPerMonth * durationMonths
  }
  
  return quantity * 30 * durationMonths
}

// Calculate total price for subscription
export const calculateSubscriptionTotal = (
  pricePerBottle: number,
  totalBottles: number,
  durationMonths: number,
  durationOptions: { value: number; discount: number }[],
): { subtotal: number; discount: number; total: number } => {
  const subtotal = pricePerBottle * totalBottles
  const durationOption = durationOptions.find(d => d.value === durationMonths)
  const discountPercent = durationOption?.discount || 0
  const discount = Math.round((subtotal * discountPercent) / 100)
  const total = subtotal - discount
  return { subtotal, discount, total }
}


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
  onEditSubscription?: (item: Omit<CartItem, "id">, product: Product) => Promise<void>
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
  const [existingSubscription, setExistingSubscription] = useState<Subscription | null>(null)
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
  const [preferredDeliveryTime, setPreferredDeliveryTime] = useState<string>("06:00-07:00")
  const [durationMonths, setDurationMonths] = useState(1) // Subscription duration
  const [durationOptions, setDurationOptions] = useState<{ value: number; label: string; discount: number }[]>([
    { value: 1, label: "1 Month", discount: 0 },
    { value: 3, label: "3 Months", discount: 5 },
    { value: 6, label: "6 Months", discount: 10 },
  ])
  
  // Computed: total bottles and pricing
  const totalBottles = useMemo(() => {
    if (!product) return 0
    return calculateTotalBottles(frequency, quantity, durationMonths, intervalDays, customQuantities)
  }, [frequency, quantity, durationMonths, intervalDays, customQuantities, product])
  
  const pricing = useMemo(() => {
    if (!product) return { subtotal: 0, discount: 0, total: 0 }
    return calculateSubscriptionTotal(product.price, totalBottles, durationMonths, durationOptions)
  }, [product, totalBottles, durationMonths, durationOptions])

  // Calculate bottle difference when editing subscription
  const bottleDifference = useMemo(() => {
    if (!existingSubscription || !product) return null
    
    // In bottle-based system, we don't need to worry about payment
    // Just show the user how the bottle consumption will change
    const currentBottles = calculateTotalBottles(
      (existingSubscription.frequency || "daily") as any,
      existingSubscription.quantity || 1,
      1, // Calculate for 1 month to show monthly change
      existingSubscription.interval_days || undefined,
      existingSubscription.custom_quantities as any || undefined
    )
    
    const newBottles = calculateTotalBottles(
      frequency,
      quantity,
      1, // Calculate for 1 month to show monthly change
      frequency === "on_interval" ? intervalDays : undefined,
      frequency === "custom" ? customQuantities : undefined
    )
    
    const difference = newBottles - currentBottles
    
    return {
      currentBottles: Math.round(currentBottles),
      newBottles: Math.round(newBottles),
      difference: Math.round(difference),
      isIncrease: difference > 0
    }
  }, [existingSubscription, product, frequency, quantity, intervalDays, customQuantities])

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [showAddressPicker, setShowAddressPicker] = useState(false)

  const snapPoints = useMemo(() => ["70%", "92%"], [])

  // ─── Fetch duration discounts from database ─────────────────────────
  
  useEffect(() => {
    const loadDurationDiscounts = async () => {
      try {
        const discounts = await fetchDurationDiscounts()
        if (discounts.length > 0) {
          const options = discounts.map(d => ({
            value: d.duration_months,
            label: `${d.duration_months} ${d.duration_months === 1 ? "Month" : "Months"}`,
            discount: d.discount_percent,
          }))
          setDurationOptions(options)
        }
      } catch (error) {
        console.error('Failed to load duration discounts:', error)
        // Keep default values if fetch fails
      }
    }
    
    loadDurationDiscounts()
  }, [])

  // ─── Imperative Handle ───────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    open: async (p: Product, editItem?: CartItem, existingSub?: Subscription) => {
      setProduct(p)
      setExistingSubscription(existingSub || null)

      // Fetch addresses
      if (user?.id) {
        try {
          const addrs = await fetchUserAddresses(user.id)
          setAddresses(addrs)
          if (editItem?.addressId) {
            const match = addrs.find((a) => a.id === editItem.addressId)
            setSelectedAddress(match || addrs.find((a) => a.is_default) || addrs[0] || null)
          } else {
            setSelectedAddress(addrs.find((a) => a.is_default) || addrs[0] || null)
          }
        } catch {
          setAddresses([])
          setSelectedAddress(null)
        }
      }

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
        setPreferredDeliveryTime(editItem.preferredDeliveryTime || "06:00-07:00")
        setDurationMonths(editItem.durationMonths || 1)
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
        setPreferredDeliveryTime("06:00-07:00")
        setDurationMonths(1)
      }
      setShowDatePicker(false)
      setShowAddressPicker(false)
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
    // If editing an existing subscription via callback (not cart)
    if (props.onEditSubscription && editingItem && product) {
      await props.onEditSubscription(payload, product)
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

    // For buy_once, don't apply duration
    const effectiveDuration = frequency === "buy_once" ? 1 : durationMonths

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
      addressId: selectedAddress?.id,
      addressName: selectedAddress?.name || undefined,
      // Prepaid subscription fields
      durationMonths: effectiveDuration,
      totalBottles: totalBottles,
      totalAmount: pricing.total,
    }

    // Check for 7 PM cutoff — show confirmation if needed
    if (shouldShowCutoffWarning(frequency, startDate)) {
      setPendingCartPayload(payload)
      setShowCutoffModal(true)
      return
    }

    // Frontend duplicate subscription check
    if (user?.id && selectedAddress?.id && !editingItem) {
      try {
        const isDuplicate = await checkDuplicateSubscription(
          user.id,
          product.id,
          selectedAddress.id,
        )
        if (isDuplicate) {
          showErrorToast(
            "Duplicate Subscription",
            `You already have an active subscription for ${product.name} at this address.`,
          )
          return
        }
      } catch {
        // If check fails, let the edge function handle it
      }
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

          {/* ─── Delivery Address ──────────────────────────────── */}
          <View className="mb-6">
            <Text className="font-sofia-bold text-base text-neutral-black mb-3">
              Delivery Address
            </Text>
            <TouchableOpacity
              className="flex-row items-center border border-neutral-lightGray rounded-lg px-3 py-3"
              onPress={() => setShowAddressPicker(!showAddressPicker)}
              activeOpacity={0.7}
            >
              <MapPin size={18} color={COLORS.neutral.gray} />
              <View className="flex-1 ml-2">
                <Text className="font-comfortaa-bold text-sm text-neutral-black">
                  {selectedAddress?.name || "Select Address"}
                </Text>
                {selectedAddress && (
                  <Text className="font-comfortaa text-xs text-neutral-gray" numberOfLines={1}>
                    {[selectedAddress.address_line1, selectedAddress.city].filter(Boolean).join(", ")}
                  </Text>
                )}
              </View>
              <ChevronDown size={16} color={COLORS.neutral.gray} />
            </TouchableOpacity>
          </View>

          {/* Address Picker */}
          {showAddressPicker && (
            <View className="mb-4 bg-neutral-lightCream rounded-xl p-3">
              <Text className="font-sofia-bold text-base text-neutral-black mb-3 text-center">
                Select Delivery Address
              </Text>
              {addresses.length === 0 ? (
                <Text className="text-center font-comfortaa text-neutral-gray py-4">
                  No addresses found. Please add one first.
                </Text>
              ) : (
                addresses.map((addr) => {
                  const isSelected = selectedAddress?.id === addr.id
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      className={`flex-row items-center border rounded-xl p-3 mb-2 ${
                        isSelected
                          ? "border-primary-navy bg-primary-navy/5"
                          : "border-neutral-lightGray bg-white"
                      }`}
                      onPress={() => {
                        setSelectedAddress(addr)
                        setShowAddressPicker(false)
                      }}
                      activeOpacity={0.7}
                    >
                      <MapPin
                        size={16}
                        color={isSelected ? COLORS.primary.navy : COLORS.neutral.gray}
                      />
                      <View className="flex-1 ml-2">
                        <Text
                          className={`font-sofia-bold text-sm ${
                            isSelected ? "text-primary-navy" : "text-neutral-darkGray"
                          }`}
                        >
                          {addr.name || "Home"}
                        </Text>
                        <Text className="font-comfortaa text-xs text-neutral-gray" numberOfLines={1}>
                          {[addr.address_line1, addr.city, addr.pincode].filter(Boolean).join(", ")}
                        </Text>
                      </View>
                      {isSelected && <Check size={18} color={COLORS.primary.navy} />}
                    </TouchableOpacity>
                  )
                })
              )}
              <TouchableOpacity
                className="mt-2 items-center py-2.5 bg-primary-navy rounded-lg"
                onPress={() => setShowAddressPicker(false)}
                activeOpacity={0.7}
              >
                <Text className="font-sofia-bold text-sm text-white">Done</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Delivery Time Notice */}
          <View className="flex-row items-center mb-6 bg-neutral-lightCream px-4 py-3 rounded-xl">
            <Clock size={16} color={COLORS.neutral.gray} />
            <Text className="font-comfortaa text-sm text-neutral-darkGray ml-2">
              Will be delivered by 7 PM
            </Text>
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

          {/* ─── Subscription Duration (not for buy_once) ──────────── */}
          {frequency !== "buy_once" && (
            <View className="mb-6">
              <Text className="font-sofia-bold text-base text-neutral-black mb-4">
                Subscription Duration
              </Text>
              <View className="flex-row gap-3">
                {durationOptions.map((option) => {
                  const isSelected = durationMonths === option.value
                  return (
                    <TouchableOpacity
                      key={option.value}
                      className={`flex-1 py-3 rounded-xl border-2 items-center ${
                        isSelected
                          ? "bg-primary-navy/5 border-primary-navy"
                          : "bg-white border-neutral-lightGray"
                      }`}
                      onPress={() => setDurationMonths(option.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`font-sofia-bold text-sm ${
                          isSelected ? "text-primary-navy" : "text-neutral-black"
                        }`}
                      >
                        {option.label}
                      </Text>
                      {option.discount > 0 && (
                        <Text className="font-comfortaa text-xs text-functional-success mt-1">
                          Save {option.discount}%
                        </Text>
                      )}
                    </TouchableOpacity>
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

          {/* ─── Pricing Summary ───────────────────────────────────── */}
          <View className="bg-neutral-lightCream rounded-xl p-4 mb-6">
            {existingSubscription && bottleDifference ? (
              // Editing existing subscription - show bottle comparison
              <>
                <View className="flex-row justify-between mb-2">
                  <Text className="font-comfortaa text-sm text-neutral-darkGray">
                    Current Usage (monthly)
                  </Text>
                  <Text className="font-sofia-bold text-sm text-neutral-black">
                    {bottleDifference.currentBottles} {bottleDifference.currentBottles === 1 ? "bottle" : "bottles"}
                  </Text>
                </View>
                
                <View className="flex-row justify-between mb-2">
                  <Text className="font-comfortaa text-sm text-neutral-darkGray">
                    New Usage (monthly)
                  </Text>
                  <Text className="font-sofia-bold text-sm text-neutral-black">
                    {bottleDifference.newBottles} {bottleDifference.newBottles === 1 ? "bottle" : "bottles"}
                  </Text>
                </View>
                
                <View className="h-px bg-neutral-lightGray my-2" />
                
                {bottleDifference.isIncrease ? (
                  <View className="flex-row justify-between">
                    <Text className="font-sofia-bold text-base text-secondary-skyBlue">
                      Increase in Usage
                    </Text>
                    <Text className="font-sofia-bold text-base text-secondary-skyBlue">
                      +{Math.abs(bottleDifference.difference)} {Math.abs(bottleDifference.difference) === 1 ? "bottle" : "bottles"}/month
                    </Text>
                  </View>
                ) : bottleDifference.difference < 0 ? (
                  <View className="flex-row justify-between">
                    <Text className="font-sofia-bold text-base text-functional-success">
                      Decrease in Usage
                    </Text>
                    <Text className="font-sofia-bold text-base text-functional-success">
                      {Math.abs(bottleDifference.difference)} {Math.abs(bottleDifference.difference) === 1 ? "bottle" : "bottles"}/month less
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row justify-between">
                    <Text className="font-sofia-bold text-base text-primary-navy">
                      No Change in Usage
                    </Text>
                    <Text className="font-sofia-bold text-base text-primary-navy">
                      Same
                    </Text>
                  </View>
                )}
                
                {/* Info note about bottles */}
                <View className="mt-3 bg-secondary-skyBlue/10 rounded-lg p-3">
                  <Text className="font-comfortaa text-xs text-secondary-skyBlue">
                    No payment required. Bottles are deducted from your balance daily when orders are created.
                  </Text>
                </View>
              </>
            ) : (
              // New subscription - show regular pricing
              <>
                <View className="flex-row justify-between mb-2">
                  <Text className="font-comfortaa text-sm text-neutral-darkGray">
                    Total Bottles
                  </Text>
                  <Text className="font-sofia-bold text-sm text-neutral-black">
                    {totalBottles} {totalBottles === 1 ? "bottle" : "bottles"}
                  </Text>
                </View>
                
                <View className="flex-row justify-between mb-2">
                  <Text className="font-comfortaa text-sm text-neutral-darkGray">
                    Subtotal ({formatCurrency(product?.price || 0)}/bottle)
                  </Text>
                  <Text className="font-sofia-bold text-sm text-neutral-black">
                    {formatCurrency(pricing.subtotal)}
                  </Text>
                </View>
                
                {pricing.discount > 0 && (
                  <View className="flex-row justify-between mb-2">
                    <Text className="font-comfortaa text-sm text-functional-success">
                      Duration Discount
                    </Text>
                    <Text className="font-sofia-bold text-sm text-functional-success">
                      -{formatCurrency(pricing.discount)}
                    </Text>
                  </View>
                )}
                
                <View className="h-px bg-neutral-lightGray my-2" />
                
                <View className="flex-row justify-between">
                  <Text className="font-sofia-bold text-base text-primary-navy">
                    Total Amount
                  </Text>
                  <Text className="font-sofia-bold text-base text-primary-navy">
                    {formatCurrency(pricing.total)}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* ─── Add To Cart Button ───────────────────────────────── */}
          <Button
            title={
              props.onEditSubscription && editingItem
                ? "Update Subscription"
                : editingItem
                  ? "Update Cart"
                  : `Add to Cart - ${formatCurrency(pricing.total)}`
            }
            onPress={handleAddToCart}
            variant="navy"
            size="medium"
          />

          {/* 7 PM Cutoff Confirmation Modal */}
          <ConfirmModal
            visible={showCutoffModal}
            onClose={handleCutoffCancel}
            onConfirm={handleCutoffConfirm}
            title="Heads up!"
            description="It's past our 7 PM cutoff for tomorrow's delivery, so your first delivery will arrive on the next available date. Is that okay?"
            confirmText="Continue"
            cancelText="Cancel"
          />
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  )
})

SubscriptionBottomSheet.displayName = "SubscriptionBottomSheet"

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
