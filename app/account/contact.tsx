import { Mail, MapPin, MessageCircle, Phone } from "lucide-react-native"
import React from "react"
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native"

export default function ContactScreen() {
  const contactInfo = [
    {
      icon: Phone,
      label: "Phone",
      value: "+91 1800-123-4567",
      action: () => Linking.openURL("tel:+918001234567"),
      actionLabel: "Call",
      actionColor: "#4285F4",
    },
    {
      icon: Mail,
      label: "Mail",
      value: "support@worlimilk.com",
      action: () => Linking.openURL("mailto:support@worlimilk.com"),
      actionLabel: "Mail",
      actionColor: "#EA4335",
    },
    {
      icon: MapPin,
      label: "Address",
      value: "Worli Dairy Farm, 123 Dairy Road,\nMumbai, Maharashtra 400018",
      action: () =>
        Linking.openURL("https://maps.google.com/?q=Worli+Dairy+Farm+Mumbai"),
      actionLabel: "Directions",
      actionColor: "#638C5F",
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "+91 1800-123-4567",
      action: () => Linking.openURL("https://wa.me/918001234567"),
      actionLabel: "WhatsApp",
      actionColor: "#25D366",
    },
  ]

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {contactInfo.map((item, index) => {
          const IconComponent = item.icon
          return (
            <TouchableOpacity
              key={index}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm active:opacity-70"
              onPress={item.action}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="font-comfortaa text-xs text-neutral-gray mb-2">
                    {item.label}
                  </Text>
                  <Text className="font-comfortaa text-base text-primary-navy leading-6">
                    {item.value}
                  </Text>
                </View>
                <View className="ml-4 items-end">
                  <View className="flex-row items-center">
                    <Text
                      className="font-sofia-bold text-sm mr-1"
                      style={{ color: item.actionColor }}
                    >
                      {item.actionLabel}
                    </Text>
                    <IconComponent size={18} color={item.actionColor} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )
        })}

        {/* Business Hours Card */}
        <View className="bg-white rounded-2xl p-4 mt-2 shadow-sm">
          <Text className="font-comfortaa text-xs text-neutral-gray mb-3">
            Business Hours
          </Text>
          <Text className="font-comfortaa text-sm text-primary-navy mb-2">
            Monday - Saturday
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray mb-4">
            6:00 AM - 9:00 PM
          </Text>
          <Text className="font-comfortaa text-sm text-primary-navy mb-2">
            Sunday
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray">
            6:00 AM - 12:00 PM
          </Text>
        </View>

        {/* Help Text */}
        <Text className="font-comfortaa text-xs text-neutral-gray text-center mt-6 px-8 leading-5">
          We're here to help! Reach out through any of the above channels for
          quick support.
        </Text>
      </ScrollView>
    </View>
  )
}
