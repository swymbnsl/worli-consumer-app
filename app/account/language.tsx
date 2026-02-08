import { useAuth } from "@/hooks/useAuth"
import { Stack, useRouter } from "expo-router"
import { CheckCircle } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"

export default function LanguageScreen() {
  const router = useRouter()
  const { userPreference, updateUserPreference } = useAuth()

  const languages = [
    { id: "en", label: "English", nativeLabel: "English" },
    { id: "hi", label: "Hindi", nativeLabel: "हिंदी" },
    { id: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  ]

  const handleSelect = async (langId: string) => {
    await updateUserPreference({ language: langId as any })
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <Stack.Screen options={{ title: "Language" }} />

      <View className="px-6 pt-6">
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.id}
            className={`bg-white rounded-2xl p-6 mb-4 shadow-md flex-row justify-between items-center active:opacity-80 ${
              userPreference?.language === lang.id
                ? "border-2 border-primary-orange"
                : ""
            }`}
            onPress={() => handleSelect(lang.id)}
          >
            <View>
              <Text className="font-sofia-bold text-lg text-primary-navy mb-1">
                {lang.label}
              </Text>
              <Text className="font-comfortaa text-sm text-neutral-darkGray">
                {lang.nativeLabel}
              </Text>
            </View>
            {userPreference?.language === lang.id && (
              <CheckCircle size={28} color="#EF6600" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
