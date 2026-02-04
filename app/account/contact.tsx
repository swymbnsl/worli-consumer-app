import { useRouter } from "expo-router"
import {
  ChevronLeft,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react-native"
import React from "react"
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native"

export default function ContactScreen() {
  const router = useRouter()

  const contactMethods = [
    {
      icon: Phone,
      title: "Phone Support",
      description: "+91 1800-123-4567",
      action: () => Linking.openURL("tel:+918001234567"),
      color: "#EF6600",
    },
    {
      icon: Mail,
      title: "Email Us",
      description: "support@freshmilk.com",
      action: () => Linking.openURL("mailto:support@freshmilk.com"),
      color: "#638C5F",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Chat with us on WhatsApp",
      action: () => Linking.openURL("https://wa.me/918001234567"),
      color: "#25D366",
    },
    {
      icon: MapPin,
      title: "Visit Us",
      description: "123 Dairy Road, Bengaluru, Karnataka 560001",
      action: null,
      color: "#DC2626",
    },
  ]

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header */}
      <View className="bg-primary-navy px-6 pt-10 pb-6 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 active:opacity-70"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text className="font-comfortaa text-xs text-primary-cream uppercase tracking-widest mb-1">
            Get In Touch
          </Text>
          <Text className="font-sofia-bold text-2xl text-white">
            Contact Us
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-comfortaa text-base text-neutral-gray mb-6 leading-6">
          We're here to help! Reach out to us through any of these channels
        </Text>

        {contactMethods.map((method, index) => {
          const IconComponent = method.icon
          return (
            <TouchableOpacity
              key={index}
              className="bg-white rounded-2xl p-5 mb-4 shadow-md flex-row items-center active:opacity-80"
              onPress={method.action || undefined}
              disabled={!method.action}
            >
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                style={{ backgroundColor: `${method.color}15` }}
              >
                <IconComponent size={26} color={method.color} />
              </View>
              <View className="flex-1">
                <Text className="font-sofia-bold text-base text-primary-navy mb-1">
                  {method.title}
                </Text>
                <Text className="font-comfortaa text-sm text-neutral-darkGray">
                  {method.description}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}

        {/* Business Hours */}
        <View className="bg-white rounded-2xl p-6 mb-8 shadow-md">
          <View className="flex-row items-center mb-4">
            <View className="w-11 h-11 rounded-xl bg-secondary-skyBlue bg-opacity-15 items-center justify-center mr-3">
              <Clock size={22} color="#A1C3E3" />
            </View>
            <Text className="font-sofia-bold text-lg text-primary-navy">
              Business Hours
            </Text>
          </View>
          <View className="ml-14">
            <Text className="font-comfortaa text-sm text-neutral-darkGray mb-2">
              Monday - Saturday: 6:00 AM - 9:00 PM
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-darkGray">
              Sunday: 6:00 AM - 12:00 PM
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
