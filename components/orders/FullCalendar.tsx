import { CalendarLegend } from "@/components/home"
import { COLORS } from "@/constants/theme"
import { Order } from "@/types/database.types"
import React from "react"
import { View } from "react-native"
import { Calendar, DateData } from "react-native-calendars"

interface FullCalendarProps {
  orders: Order[]
  selectedDate: string
  onDateSelect: (date: string) => void
}

export default function FullCalendar({
  orders,
  selectedDate,
  onDateSelect,
}: FullCalendarProps) {
  // Map orders to marked dates
  const markedDates = orders.reduce(
    (acc, order) => {
      const date = order.delivery_date
      let color = COLORS.primary // default

      if (order.status === "delivered") color = "#638C5F" // functional.success
      else if (order.status === "pending" || order.status === "confirmed")
        color = "#A1C3E3" // secondary.skyBlue
      else if (order.status === "cancelled") color = "#EF6600" // functional.error

      // If multiple orders on same day, we might want multiple dots,
      // but react-native-calendars 'simple' marking supports one dot.
      // For Multi-dot, use 'multi-dot' marking type.
      // For now, let's assume one main status or prioritize.
      // Delivered > Pending > Cancelled

      if (!acc[date]) {
        acc[date] = {
          marked: true,
          dotColor: color,
        }
      } else {
        // Priority logic if needed, or simple overwrite
        // If existing is delivered, keep it.
        // If current is delivered, overwrite.
        if (order.status === "delivered") {
          acc[date].dotColor = color
        }
      }
      return acc
    },
    {} as Record<string, any>,
  )

  // Add selection styling
  // We merge with existing markers
  const finalMarkedDates = { ...markedDates }
  if (selectedDate) {
    if (finalMarkedDates[selectedDate]) {
      finalMarkedDates[selectedDate] = {
        ...finalMarkedDates[selectedDate],
        selected: true,
        selectedColor: "#638C5F", // success/green from screenshot
        selectedTextColor: "#FFFFFF",
      }
    } else {
      finalMarkedDates[selectedDate] = {
        selected: true,
        selectedColor: "#638C5F",
        selectedTextColor: "#FFFFFF",
      }
    }
  }

  return (
    <View className="bg-white rounded-[20px] p-4 shadow-sm mb-6">
      <CalendarLegend />
      <View className="h-4" />
      <Calendar
        // Minimal configuration to match screenshot
        current={selectedDate}
        onDayPress={(day: DateData) => {
          onDateSelect(day.dateString)
        }}
        markedDates={finalMarkedDates}
        theme={{
          backgroundColor: "#ffffff",
          calendarBackground: "#ffffff",
          textSectionTitleColor: "#b6c1cd",
          selectedDayBackgroundColor: "#638C5F",
          selectedDayTextColor: "#ffffff",
          todayTextColor: "#00adf5",
          dayTextColor: "#2d4150",
          textDisabledColor: "#d9e1e8",
          dotColor: "#00adf5",
          selectedDotColor: "#ffffff",
          arrowColor: "#101B53", // primary-navy
          monthTextColor: "#101B53",
          indicatorColor: "blue",
          textDayFontFamily: "Sofia-Pro-Regular",
          textMonthFontFamily: "Sofia-Pro-Bold",
          textDayHeaderFontFamily: "Comfortaa-Bold",
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 13,
        }}
        enableSwipeMonths={true}
      />
    </View>
  )
}
