import ProductImage from "@/components/common/ProductImage"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import PageHeader from "@/components/ui/PageHeader"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import {
  claimFreeSample,
  fetchFreeSampleConfig,
  fetchProductById,
  fetchUserAddresses,
  hasClaimedFreeSample,
} from "@/lib/supabase-service"
import { Address, FreeSampleConfig, Product } from "@/types/database.types"
import { useRouter } from "expo-router"
import {
  Calendar,
  Check,
  CheckCircle,
  Gift,
  MapPin,
  Milk,
  Sparkles,
  X,
} from "lucide-react-native"
import React, { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Get a local "YYYY-MM-DD" string offset by `daysFromToday`. */
function getDateStr(daysFromToday: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDateForDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  const weekday = dt.toLocaleDateString("en-IN", { weekday: "short" })
  const month = dt.toLocaleDateString("en-IN", { month: "short" })
  return `${weekday}, ${d} ${month}`
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function FreeSampleScreen() {
  const { user } = useAuth()
  const router = useRouter()

  // Data state
  const [config, setConfig] = useState<FreeSampleConfig | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [loading, setLoading] = useState(true)

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [showAddressModal, setShowAddressModal] = useState(false)

  // Selection state
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  // Claim state
  const [claiming, setClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)

  // ─── Fetch config + claim status + addresses ────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [configData, claimed] = await Promise.all([
        fetchFreeSampleConfig(),
        user ? hasClaimedFreeSample(user.id) : Promise.resolve(false),
      ])

      setConfig(configData)
      setAlreadyClaimed(claimed)

      if (configData?.product_id) {
        const prod = await fetchProductById(configData.product_id)
        setProduct(prod)
      }

      // Fetch addresses
      if (user) {
        const addrs = await fetchUserAddresses(user.id)
        setAddresses(addrs)
        const defaultAddr = addrs.find((a) => a.is_default) || addrs[0] || null
        setSelectedAddress(defaultAddr)
      }
    } catch (err) {
      console.error("Error fetching free sample data:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Date selection ───────────────────────────────────────────────────
  const maxDates = config?.trial_days ?? 3

  // Build available dates: tomorrow → 14 days out
  const availableDates: string[] = []
  for (let i = 1; i <= 14; i++) {
    availableDates.push(getDateStr(i))
  }

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      if (prev.includes(dateStr)) {
        return prev.filter((d) => d !== dateStr)
      }
      if (prev.length >= maxDates) return prev // can't select more
      return [...prev, dateStr].sort()
    })
  }

  // ─── Claim handler ────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (selectedDates.length === 0) return

    if (!selectedAddress) {
      alert("Please select a delivery address.")
      return
    }

    setClaiming(true)
    try {
      const result = await claimFreeSample(selectedDates, selectedAddress.id)
      if (result.success) {
        setClaimSuccess(true)
        setAlreadyClaimed(true)
      } else {
        console.error("Claim failed:", result.error)
        // Show error inline
        alert(result.error)
      }
    } catch (err) {
      console.error("Claim error:", err)
      alert("Something went wrong. Please try again.")
    } finally {
      setClaiming(false)
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <PageHeader title="Free Sample" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary.navy} />
        </View>
      </View>
    )
  }

  // ─── Feature disabled ─────────────────────────────────────────────────
  if (!config) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <PageHeader title="Free Sample" />
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-primary-navy/5 p-4 rounded-2xl mb-6">
            <Gift size={64} color={COLORS.primary.navy} strokeWidth={1.5} />
          </View>
          <Text className="font-sofia-bold text-xl text-primary-navy text-center mb-3">
            Free Samples Unavailable
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray text-center mb-6">
            Free samples are not available right now. Check back later!
          </Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="navy"
            size="medium"
            fullWidth={false}
          />
        </View>
      </View>
    )
  }

  // ─── Success state ────────────────────────────────────────────────────
  if (claimSuccess) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <PageHeader title="Free Sample" />
        <View className="flex-1 justify-center items-center px-8">
          <Animated.View entering={FadeInUp.duration(500)}>
            <View className="bg-functional-success/10 p-6 rounded-full mb-6">
              <CheckCircle
                size={72}
                color={COLORS.functional.success}
                strokeWidth={1.5}
              />
            </View>
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(500).delay(200)}>
            <Text className="font-sofia-bold text-2xl text-primary-navy text-center mb-3">
              Free Sample Claimed! 🎉
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-gray text-center mb-2">
              Your free deliveries have been scheduled:
            </Text>
          </Animated.View>
          <Animated.View
            entering={FadeInUp.duration(500).delay(400)}
            className="bg-white rounded-2xl p-5 mt-4 w-full"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            {selectedDates.map((date, idx) => (
              <View
                key={date}
                className={`flex-row items-center py-3 ${idx < selectedDates.length - 1 ? "border-b border-neutral-lightGray" : ""}`}
              >
                <View className="w-8 h-8 rounded-lg bg-functional-success/10 items-center justify-center mr-3">
                  <Calendar
                    size={16}
                    color={COLORS.functional.success}
                  />
                </View>
                <Text className="font-comfortaa text-sm text-primary-navy flex-1">
                  {formatDateForDisplay(date)}
                </Text>
                <Text className="font-sofia-bold text-sm text-functional-success">
                  ₹0
                </Text>
              </View>
            ))}
          </Animated.View>
          <View className="mt-8 w-full px-4">
            <Button
              title="View My Orders"
              onPress={() => router.replace("/(tabs)/orders")}
              variant="navy"
              size="medium"
            />
          </View>
        </View>
      </View>
    )
  }

  // ─── Already claimed state ────────────────────────────────────────────
  if (alreadyClaimed) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <PageHeader title="Free Sample" />
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-primary-navy/5 p-4 rounded-2xl mb-6 relative">
            <Gift size={64} color={COLORS.primary.navy} strokeWidth={1.5} />
            <View className="absolute -bottom-2 -right-2 bg-primary-navy rounded-full p-2 border-4 border-neutral-lightCream">
              <CheckCircle size={16} color="white" strokeWidth={3} />
            </View>
          </View>
          <Text className="font-sofia-bold text-xl text-primary-navy text-center mb-3">
            Already Claimed
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray text-center mb-6">
            You've already claimed your free sample. Enjoy your deliveries!
          </Text>
          <Button
            title="View My Orders"
            onPress={() => router.replace("/(tabs)/orders")}
            variant="navy"
            size="medium"
            fullWidth={false}
          />
        </View>
      </View>
    )
  }

  // ─── Main claim UI ────────────────────────────────────────────────────
  const canClaim = selectedDates.length > 0 && selectedAddress !== null

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <PageHeader title="Free Sample" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Section */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="bg-white items-center py-10 px-6"
        >
          <View className="bg-primary-cream/50 p-3 rounded-full mb-4">
            <Sparkles size={20} color={COLORS.primary.orange} />
          </View>
          <Text className="font-sofia-bold text-xs text-primary-orange uppercase tracking-wider mb-4">
            Limited Time Offer
          </Text>

          {product && (
            <ProductImage
              imageUrl={product.image_url}
              size="large"
              containerClassName="shadow-lg mb-6"
            />
          )}

          <Text className="font-sofia-bold text-2xl text-primary-navy text-center mb-2">
            {product?.name ?? "Free Sample"}
          </Text>
          {product?.volume && (
            <Text className="font-comfortaa text-sm text-neutral-gray mb-3">
              {product.volume}
            </Text>
          )}
          <Text className="font-comfortaa text-sm text-neutral-darkGray text-center leading-5 px-4">
            {config.description ?? `Try our milk free for ${maxDates} days!`}
          </Text>
        </Animated.View>

        {/* Trial Details Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          className="bg-white mx-5 mt-4 rounded-2xl p-5"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="font-sofia-bold text-lg text-primary-navy mb-4">
            What You Get
          </Text>

          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-lg bg-primary-cream items-center justify-center mr-3">
              <Milk size={16} color={COLORS.primary.orange} />
            </View>
            <Text className="flex-1 font-comfortaa text-sm text-primary-navy">
              {config.quantity_per_day} × {product?.volume ?? "500ml"} per day
            </Text>
          </View>

          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-lg bg-primary-cream items-center justify-center mr-3">
              <Calendar size={16} color={COLORS.primary.orange} />
            </View>
            <Text className="flex-1 font-comfortaa text-sm text-primary-navy">
              {maxDates} day{maxDates > 1 ? "s" : ""} of free delivery
            </Text>
          </View>

          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-lg bg-functional-success/10 items-center justify-center mr-3">
              <Gift size={16} color={COLORS.functional.success} />
            </View>
            <Text className="flex-1 font-sofia-bold text-sm text-functional-success">
              Completely FREE — ₹0
            </Text>
          </View>
        </Animated.View>

        {/* Delivery Address */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          className="mx-5 mt-4"
        >
          <Text className="font-sofia-bold text-lg text-primary-navy mb-3">
            Delivery Address
          </Text>
          <View className="bg-white rounded-2xl p-4 border border-neutral-lightGray">
            <View className="flex-row items-start">
              <MapPin
                size={20}
                color={COLORS.primary.navy}
                style={{ marginTop: 2 }}
              />
              <View className="flex-1 ml-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-sofia-bold text-sm text-primary-navy">
                    {selectedAddress
                      ? `Delivering To ${selectedAddress.name || "Home"}`
                      : "Select Address"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowAddressModal(true)}>
                    <Text className="font-sofia-bold text-xs text-primary-navy underline">
                      {selectedAddress ? "Change" : "Select"}
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
        </Animated.View>

        {/* Date Picker */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          className="mx-5 mt-4"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-sofia-bold text-lg text-primary-navy">
              Select Delivery Dates
            </Text>
            <View className="bg-primary-cream px-3 py-1.5 rounded-full">
              <Text className="font-sofia-bold text-xs text-primary-orange">
                {selectedDates.length}/{maxDates}
              </Text>
            </View>
          </View>

          <Text className="font-comfortaa text-xs text-neutral-gray mb-4">
            Choose up to {maxDates} date{maxDates > 1 ? "s" : ""} for your free deliveries
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {availableDates.map((dateStr) => {
              const isSelected = selectedDates.includes(dateStr)
              const isDisabled =
                !isSelected && selectedDates.length >= maxDates

              return (
                <TouchableOpacity
                  key={dateStr}
                  onPress={() => toggleDate(dateStr)}
                  disabled={isDisabled}
                  className={`rounded-xl px-4 py-3 border-2 ${
                    isSelected
                      ? "bg-primary-navy border-primary-navy"
                      : isDisabled
                        ? "bg-neutral-lightGray/20 border-neutral-lightGray"
                        : "bg-white border-neutral-lightGray"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-comfortaa text-xs ${
                      isSelected
                        ? "text-white"
                        : isDisabled
                          ? "text-neutral-gray"
                          : "text-primary-navy"
                    }`}
                  >
                    {formatDateForDisplay(dateStr)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Selected dates summary */}
          {selectedDates.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mt-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                Selected Dates
              </Text>
              {selectedDates.map((date) => (
                <View
                  key={date}
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-md bg-primary-navy/10 items-center justify-center mr-2">
                      <Calendar
                        size={12}
                        color={COLORS.primary.navy}
                      />
                    </View>
                    <Text className="font-comfortaa text-xs text-primary-navy">
                      {formatDateForDisplay(date)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleDate(date)}>
                    <X size={16} color={COLORS.neutral.gray} />
                  </TouchableOpacity>
                </View>
              ))}
              <View className="border-t border-neutral-lightGray mt-2 pt-3 flex-row justify-between">
                <Text className="font-sofia-bold text-sm text-primary-navy">
                  Total
                </Text>
                <Text className="font-sofia-bold text-sm text-functional-success">
                  ₹0.00
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white px-5 pb-8 pt-4 border-t border-neutral-lightGray"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Button
          title={
            selectedDates.length === 0
              ? "Select Dates to Continue"
              : !selectedAddress
                ? "Select Address to Continue"
                : `Claim Free Sample (${selectedDates.length} day${selectedDates.length > 1 ? "s" : ""})`
          }
          onPress={handleClaim}
          variant="navy"
          size="large"
          disabled={!canClaim}
          isLoading={claiming}
        />
      </View>

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
    </View>
  )
}
