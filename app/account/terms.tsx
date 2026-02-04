import PageHeader from "@/components/ui/PageHeader"
import { useRouter } from "expo-router"
import React from "react"
import { ScrollView, Text, View } from "react-native"

export default function TermsScreen() {
  const router = useRouter()

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content:
        "By accessing and using the FreshMilk app, you accept and agree to be bound by the terms and provision of this agreement.",
    },
    {
      title: "2. Use License",
      content:
        "Permission is granted to temporarily download one copy of the materials on FreshMilk's app for personal, non-commercial transitory viewing only.",
    },
    {
      title: "3. Subscription Terms",
      content:
        "Subscriptions are billed on a daily basis. You may cancel your subscription at any time. Refunds are not provided for partial subscription periods.",
    },
    {
      title: "4. Delivery Terms",
      content:
        "We aim to deliver between 6:00 AM to 8:00 AM daily. Delivery times may vary based on location and weather conditions. You must return empty bottles within 3 days of delivery.",
    },
    {
      title: "5. Payment Terms",
      content:
        "All payments must be made through the app wallet. We accept UPI, cards, and net banking. Failed transactions will be automatically refunded within 5-7 business days.",
    },
    {
      title: "6. Privacy Policy",
      content:
        "Your privacy is important to us. We collect and use your personal information only for providing our services. See our Privacy Policy for more details.",
    },
    {
      title: "7. Limitation of Liability",
      content:
        "FreshMilk shall not be held liable for any damages arising from the use of our service, including but not limited to direct, indirect, incidental, or consequential damages.",
    },
    {
      title: "8. Changes to Terms",
      content:
        "We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.",
    },
  ]

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header */}
      <PageHeader
        title="Terms & Conditions"
        subtitle="Legal"
        showBackButton={true}
      />

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
