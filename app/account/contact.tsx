import { Mail, MapPin, MessageCircle, Phone } from "lucide-react-native"
import React from "react"
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native"

import { fetchAppSetting } from "@/lib/supabase-service"

export default function ContactScreen() {
  const [phone, setPhone] = React.useState("+91 1800-123-4567")
  const [email, setEmail] = React.useState("support@worlimilk.com")
  const [address, setAddress] = React.useState("Worli Dairy Farm, 123 Dairy Road,\n Mumbai, Maharashtra 400018")
  const [mapUrl, setMapUrl] = React.useState("https://maps.google.com/?q=Worli+Dairy+Farm+Mumbai")
  const [whatsappPhone, setWhatsappPhone] = React.useState("+91 1800-123-4567")
  const [whatsappUrl, setWhatsappUrl] = React.useState("https://wa.me/918001234567")

  React.useEffect(() => {
    const loadSettings = async () => {
      const p = await fetchAppSetting("contact_phone")
      if (p) setPhone(p)

      const e = await fetchAppSetting("contact_email")
      if (e) setEmail(e)

      const a = await fetchAppSetting("contact_address")
      if (a) setAddress(a.replace(/\\n/g, "\n"))

      const mUrl = await fetchAppSetting("contact_map_url")
      if (mUrl) setMapUrl(mUrl)

      const wPhone = await fetchAppSetting("contact_whatsapp_phone")
      if (wPhone) setWhatsappPhone(wPhone)

      const wUrl = await fetchAppSetting("contact_whatsapp")
      if (wUrl) setWhatsappUrl(wUrl)
    }
    loadSettings()
  }, [])

  const contactInfo = [
    {
      icon: Phone,
      label: "Phone",
      value: phone,
      action: () => Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`),
      actionLabel: "Call",
      actionColor: "#4285F4",
    },
    {
      icon: Mail,
      label: "Mail",
      value: email,
      action: () => Linking.openURL(`mailto:${email}`),
      actionLabel: "Mail",
      actionColor: "#EA4335",
    },
    {
      icon: MapPin,
      label: "Address",
      value: address,
      action: () => Linking.openURL(mapUrl),
      actionLabel: "Directions",
      actionColor: "#638C5F",
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: whatsappPhone,
      action: () => Linking.openURL(whatsappUrl),
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
                  <Text className="font-sofia-bold text-xs text-neutral-gray mb-2">
                    {item.label}
                  </Text>
                  <Text className="font-sofia-bold text-base text-primary-navy leading-6">
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
          <Text className="font-sofia-bold text-xs text-neutral-gray mb-3">
            Business Hours
          </Text>
          <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
            Monday - Saturday
          </Text>
          <Text className="font-sofia-bold text-sm text-neutral-gray mb-4">
            6:00 AM - 9:00 PM
          </Text>
          <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
            Sunday
          </Text>
          <Text className="font-sofia-bold text-sm text-neutral-gray">
            6:00 AM - 12:00 PM
          </Text>
        </View>

        {/* Help Text */}
        <Text className="font-sofia-bold text-xs text-neutral-gray text-center mt-6 px-8 leading-5">
          We're here to help! Reach out through any of the above channels for
          quick support.
        </Text>
      </ScrollView>
    </View>
  )
}
