import React from "react"
import { ScrollView, Text, View } from "react-native"

export default function PrivacyScreen() {
  const sections = [
    {
      title: "Information We Collect",
      content:
        "We collect information you provide directly to us, including your name, phone number, email address, delivery addresses, and payment information.",
    },
    {
      title: "How We Use Your Information",
      content:
        "We use the information we collect to provide, maintain, and improve our services, process transactions, send notifications about your orders, and respond to your comments and questions.",
    },
    {
      title: "Information Sharing",
      content:
        "We do not share your personal information with third parties except as necessary to provide our services (e.g., delivery partners) or as required by law.",
    },
    {
      title: "Data Security",
      content:
        "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.",
    },
    {
      title: "Your Rights",
      content:
        "You have the right to access, update, or delete your personal information at any time through the app settings. You can also request a copy of your data.",
    },
    {
      title: "Cookies and Tracking",
      content:
        "We use cookies and similar tracking technologies to track activity on our service and store certain information to improve user experience.",
    },
    {
      title: "Children's Privacy",
      content:
        "Our service is not intended for children under 18. We do not knowingly collect personal information from children under 18.",
    },
    {
      title: "Changes to Privacy Policy",
      content:
        "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.",
    },
  ]

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          <Text className="font-comfortaa text-sm text-neutral-gray mb-6 leading-5">
            Last updated: December 26, 2025
          </Text>

          {sections.map((section, index) => (
            <View
              key={index}
              className="bg-white rounded-2xl p-5 mb-4 shadow-md"
            >
              <Text className="font-sofia-bold text-base text-primary-navy mb-3">
                {section.title}
              </Text>
              <Text className="font-comfortaa text-sm text-neutral-darkGray leading-5">
                {section.content}
              </Text>
            </View>
          ))}

          <View className="h-8" />
        </View>
      </ScrollView>
    </View>
  )
}
