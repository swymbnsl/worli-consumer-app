import { COLORS } from "@/constants/theme"
import { useRouter } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

interface MenuItem {
  id: string
  label: string
  icon: any
  color?: string
  iconBg?: string
  route?: string
  action?: () => void
  onPress?: () => void
  isDanger?: boolean
}

interface MenuSectionProps {
  title?: string
  items: MenuItem[]
  index?: number
}

export default function MenuSection({ title, items, index = 0 }: MenuSectionProps) {
  const router = useRouter()

  const handlePress = (item: MenuItem) => {
    if (item.onPress) {
      item.onPress();
    } else if (item.action) {
      item.action();
    } else if (item.route) {
      // @ts-ignore
      router.push(item.route);
    }
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(500).delay(index * 60)}
      className="mx-4 mb-4"
    >
      {title && (
        <Text className="font-sofia-bold text-xs text-neutral-gray uppercase tracking-wider mb-2 ml-1">
          {title}
        </Text>
      )}
      <View
        className="bg-white rounded-2xl overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {items.map((item, idx) => {
          const IconComponent = item.icon
          const isLast = idx === items.length - 1
          const isDanger = item.isDanger
          const iconColor = isDanger
            ? COLORS.functional.error
            : item.color || COLORS.primary.navy
          const iconBg = isDanger
            ? "#FEE2E2"
            : item.iconBg || `${COLORS.primary.navy}0D`

          return (
            <TouchableOpacity
              key={item.id}
              className="flex-row items-center px-4 py-3.5"
              style={!isLast ? { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" } : undefined}
              onPress={() => handlePress(item)}
              activeOpacity={0.6}
            >
              {/* Icon with tinted bg */}
              <View
                className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: iconBg }}
              >
                <IconComponent size={18} color={iconColor} strokeWidth={2} />
              </View>

              {/* Label */}
              <Text
                className={`flex-1 font-comfortaa text-sm ${isDanger ? "text-functional-error" : "text-primary-navy"}`}
              >
                {item.label}
              </Text>

              {/* Chevron */}
              {!isDanger && (
                <ChevronRight size={16} color="#D1D5DB" strokeWidth={2} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </Animated.View>
  )
}