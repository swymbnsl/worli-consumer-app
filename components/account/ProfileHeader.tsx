import { User } from "@/types/database.types"
import FontAwesome6 from '@expo/vector-icons/FontAwesome6'
import { useRouter } from "expo-router"
import { User as UserIcon } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"

interface ProfileHeaderProps {
  user: User | null
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  const router = useRouter()
  
  if (!user) return null

  return (
    <View className="bg-primary-navy px-4 pt-6 pb-6">
      <View className="flex-row items-center justify-between">
        {/* Left: Avatar + Name & Phone */}
        <View className="flex-row items-center flex-1">
          {/* Avatar */}
          <View className="w-16 h-16 rounded-full bg-white/30 items-center justify-center border-2 border-white mr-4">
            <UserIcon size={28} color="#FFFFFF" strokeWidth={2} />
          </View>
          
          {/* Name & Phone */}
          <View className="flex-1">
            <Text className="font-sofia-bold text-lg text-white mb-0.5" numberOfLines={1}>
              {user.full_name || "User"}
            </Text>
            <Text className="font-comfortaa text-sm text-white/80" numberOfLines={1}>
              {user.phone_number}
            </Text>
          </View>
        </View>
        
        {/* Right: EDIT PROFILE Button */}
        <TouchableOpacity 
          className="ml-3 px-2 py-1"
          onPress={() => router.push("/account/profile")}
          activeOpacity={0.7}
        >
          <Text className="font-comfortaa-bold text-xs text-white text-left leading-4">
            EDIT{"\n"}PROFILE
          </Text>
        </TouchableOpacity>
        <View className="mr-2">
          <FontAwesome6 name="pencil" size={14} color="#FFFFFF" />
        </View>
      </View>
    </View>
  )
}
