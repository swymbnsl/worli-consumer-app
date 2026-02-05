import { Search } from "lucide-react-native"
import React from "react"
import { TextInput, TouchableOpacity, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

interface SearchBarProps {
  value?: string
  onChangeText?: (text: string) => void
  onPress?: () => void
  placeholder?: string
  editable?: boolean
}

export default function SearchBar({
  value,
  onChangeText,
  onPress,
  placeholder = "Search for Organic milk",
  editable = true,
}: SearchBarProps) {
  const Container = onPress ? TouchableOpacity : View

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
      <Container onPress={onPress} activeOpacity={0.8} className="relative">
        <View className="bg-white border border-neutral-lightGray rounded-2xl flex-row items-center px-4 py-3 shadow-sm">
          <Search size={20} color="#B3B3B3" />
          <TextInput
            className="flex-1 ml-3 font-comfortaa text-base text-neutral-darkGray"
            placeholder={placeholder}
            placeholderTextColor="#B3B3B3"
            value={value}
            onChangeText={onChangeText}
            editable={editable && !onPress}
            pointerEvents={onPress ? "none" : "auto"}
          />
        </View>
      </Container>
    </Animated.View>
  )
}
