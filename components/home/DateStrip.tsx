import { Order } from "@/types/database.types"
import React, { useEffect, useRef } from "react"
import { FlatList, Text, TouchableOpacity, View } from "react-native"

export type DeliveryStatus =
  | "delivered"
  | "upcoming"
  | "vacation"
  | "on_hold"
  | null

interface DateStripProps {
  orders: Order[]
  selectedDate: string
  onSelectDate: (date: string) => void
  vacationDates?: string[]
  holdDates?: string[]
}

interface DayItem {
  date: string
  day: number
  dayName: string
  month: string
  isToday: boolean
  isFirstOfMonth: boolean
  status: DeliveryStatus
}

const generateDays = (
  orders: Order[],
  vacationDates: string[] = [],
  holdDates: string[] = [],
): DayItem[] => {
  const days: DayItem[] = []
  
  // Get today's date in local timezone
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDate = today.getDate()

  // Start from 15 days ago, show 31 days total (15 past + today + 15 future)
  const startDate = new Date(todayYear, todayMonth, todayDate - 15)

  for (let i = 0; i < 31; i++) {
    const currentDate = new Date(todayYear, todayMonth, todayDate - 15 + i)
    
    // Format date as YYYY-MM-DD in local timezone
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, "0")
    const day = String(currentDate.getDate()).padStart(2, "0")
    const dateStr = `${year}-${month}-${day}`

    const isToday = 
      currentDate.getFullYear() === todayYear &&
      currentDate.getMonth() === todayMonth &&
      currentDate.getDate() === todayDate
    const isFirstOfMonth = currentDate.getDate() === 1

    // Determine status
    let status: DeliveryStatus = null

    if (vacationDates.includes(dateStr)) {
      status = "vacation"
    } else if (holdDates.includes(dateStr)) {
      status = "on_hold"
    } else {
      const order = orders.find((o) => o.delivery_date === dateStr)
      if (order) {
        if (order.status === "delivered") {
          status = "delivered"
        } else if (order.status === "cancelled") {
          status = null
        } else {
          status = "upcoming"
        }
      }
    }

    days.push({
      date: dateStr,
      day: currentDate.getDate(),
      dayName: currentDate
        .toLocaleDateString("en-IN", { weekday: "short" })
        .slice(0, 3),
      month: currentDate.toLocaleDateString("en-IN", { month: "short" }),
      isToday,
      isFirstOfMonth,
      status,
    })
  }

  return days
}

const getStatusColor = (status: DeliveryStatus): string => {
  switch (status) {
    case "delivered":
      return "bg-functional-success"
    case "upcoming":
      return "bg-secondary-skyBlue"
    case "vacation":
      return "bg-secondary-gold"
    case "on_hold":
      return "bg-functional-error"
    default:
      return ""
  }
}

export default function DateStrip({
  orders,
  selectedDate,
  onSelectDate,
  vacationDates = [],
  holdDates = [],
}: DateStripProps) {
  const flatListRef = useRef<FlatList>(null)
  const days = generateDays(orders, vacationDates, holdDates)

  // Find today's index to scroll to it initially
  const todayIndex = days.findIndex((d) => d.isToday)

  useEffect(() => {
    // Scroll to today on mount
    if (flatListRef.current && todayIndex >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: todayIndex,
          animated: true,
          viewPosition: 0.5, // Center it
        })
      }, 100)
    }
  }, [todayIndex])

  const renderDay = ({ item, index }: { item: DayItem; index: number }) => {
    const isSelected = item.date === selectedDate
    const previousItem = index > 0 ? days[index - 1] : null
    const showMonthLabel =
      (item.isFirstOfMonth && previousItem?.month !== item.month) || index === 0

    return (
      <View className="flex-row items-center">
        {/* Month Label - positioned to the left of first day of month */}
        {showMonthLabel && (
          <View className="mr-2">
            <Text className="font-comfortaa text-xs text-neutral-gray uppercase">
              {item.month}
            </Text>
          </View>
        )}

        {/* Date Column */}
        <View className="items-center">
          {/* Day Name - Outside and above the circle */}
          <Text
            className={`font-comfortaa text-[10px] mb-1 ${
              isSelected || item.isToday
                ? "text-neutral-darkGray"
                : "text-neutral-gray"
            }`}
          >
            {item.dayName}
          </Text>

          {/* Date Item with Circle Background */}
          <TouchableOpacity
            onPress={() => onSelectDate(item.date)}
            className={`items-center justify-center w-10 h-10 rounded-full ${
              isSelected
                ? "bg-primary-navy"
                : item.isToday
                  ? "bg-secondary-skyBlue"
                  : ""
            }`}
            activeOpacity={0.7}
          >
            {/* Day Number */}
            <Text
              className={`font-sofia-bold text-sm ${
                isSelected
                  ? "text-white"
                  : item.isToday
                    ? "text-white"
                    : "text-neutral-darkGray"
              }`}
            >
              {String(item.day).padStart(2, "0")}
            </Text>
          </TouchableOpacity>

          {/* Status Indicator Dot - Below the circle */}
          <View className="h-3 items-center justify-center mt-0.5">
            {item.status && (
              <View
                className={`w-1.5 h-1.5 rounded-full ${getStatusColor(item.status)}`}
              />
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="bg-white/50 py-3">
      <FlatList
        ref={flatListRef}
        data={days}
        keyExtractor={(item) => item.date}
        renderItem={renderDay}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        ItemSeparatorComponent={() => <View style={{ width: 4 }} />}
        getItemLayout={(_, index) => ({
          length: 52,
          offset: 52 * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            })
          }, 100)
        }}
      />
    </View>
  )
}
