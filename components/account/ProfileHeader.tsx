import { COLORS } from "@/constants/theme"
import { User as UserType } from "@/types/database.types"
import { useRouter } from "expo-router"
import { Pencil } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

interface ProfileHeaderProps {
  user: UserType | null
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  const router = useRouter()

  if (!user) return null

  const initials = (user.full_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Animated.View entering={FadeInUp.duration(500)}>
      <TouchableOpacity
        className="mx-4 mt-2 bg-white rounded-2xl p-5 flex-row items-center"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
        onPress={() => router.push("/account/profile")}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View
          className="w-14 h-14 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: COLORS.primary.navy }}
        >
          <Text className="font-sofia-bold text-lg text-white">{initials}</Text>
        </View>

        {/* Name & Phone */}
        <View className="flex-1">
          <Text
            className="font-sofia-bold text-lg text-primary-navy"
            numberOfLines={1}
          >
            {user.full_name || "User"}
          </Text>
          <Text
            className="font-comfortaa text-sm text-neutral-gray mt-0.5"
            numberOfLines={1}
          >
            {user.phone_number}
          </Text>
        </View>

        {/* Edit chevron */}
        <View className="w-8 h-8 rounded-full bg-neutral-lightCream items-center justify-center">
          <Pencil size={14} color={COLORS.neutral.darkGray} strokeWidth={2} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}
