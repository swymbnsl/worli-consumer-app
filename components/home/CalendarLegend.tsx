import React from "react"
import { Text, View } from "react-native"

type DeliveryStatus = "delivered" | "upcoming" | "vacation" | "on_hold" | null

interface LegendItem {
  status: DeliveryStatus
  label: string
  color: string
}

const legendItems: LegendItem[] = [
  { status: "delivered", label: "Delivered", color: "bg-functional-success" },
  { status: "upcoming", label: "Upcoming", color: "bg-secondary-skyBlue" },
  { status: "vacation", label: "Vacation", color: "bg-secondary-gold" },
  { status: "on_hold", label: "On Hold", color: "bg-functional-error" },
]

export default function CalendarLegend() {
  return (
    <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
      {legendItems.map((item) => (
        <View key={item.status} className="flex-row items-center gap-1.5">
          <View className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
          <Text className="font-comfortaa text-xs text-neutral-darkGray">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  )
}
