import Button from "@/components/ui/Button"
import { router } from "expo-router"
import { Bell, LucideIcon, Recycle, Sun } from "lucide-react-native"
import React from "react"
import { Image, ScrollView, Text, View } from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"

interface FeatureItem {
  icon: LucideIcon
  title: string
  description: string
  color: string
  bgClass: string
}

const features: FeatureItem[] = [
  {
    icon: Sun,
    title: "Daily Fresh Delivery",
    description: "Farm fresh milk at your doorstep every morning",
    color: "#638C5F", // secondary-sage
    bgClass: "bg-secondary-sage/10",
  },
  {
    icon: Bell,
    title: "Flexible Subscriptions",
    description: "Pause, modify or cancel anytime",
    color: "#EF6600", // primary-orange
    bgClass: "bg-primary-orange/10",
  },
  {
    icon: Recycle,
    title: "Eco-Friendly Glass Bottles",
    description: "Returnable bottles for a greener planet",
    color: "#638C5F", // functional-success
    bgClass: "bg-functional-success/10",
  },
]

export default function Onboarding() {
  const handleGetStarted = () => {
    router.push("/(auth)/login")
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-between px-6 py-12">
          {/* Top Section - Logo and Illustration */}
          <View className="items-center justify-center py-8">
            <Animated.View
              entering={FadeInDown.duration(600).delay(100)}
              className="items-center"
            >
              {/* Logo - centered splash image */}
              <View className="items-center justify-center mb-8">
                <Image
                  source={require("../assets/images/splash-icon.jpg")}
                  style={{ width: 112, height: 112, alignSelf: "center" }}
                  resizeMode="contain"
                />
              </View>

              {/* Brand Name */}
              <Text className="font-sofia-bold text-5xl text-primary-navy mb-3 tracking-wider text-center">
                Worli Dairy
              </Text>
              <Text className="font-comfortaa text-sm text-neutral-gray tracking-widest uppercase text-center">
                Premium Fresh Milk
              </Text>
            </Animated.View>
          </View>

          {/* Middle Section - Features */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(300)}
            className="mb-12"
          >
            <View className="bg-white rounded-2xl p-8 shadow-lg">
              {features.map((feature, index) => (
                <View
                  key={index}
                  className={`flex-row items-center ${
                    index !== features.length - 1 ? "mb-6" : ""
                  }`}
                >
                  <View
                    className={`w-12 h-12 rounded-full ${feature.bgClass} items-center justify-center mr-4`}
                  >
                    <feature.icon size={24} color={feature.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sofia-bold text-base text-primary-navy mb-1">
                      {feature.title}
                    </Text>
                    <Text className="font-comfortaa text-xs text-neutral-gray leading-4">
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Bottom Section - CTA */}
          <Animated.View entering={FadeInUp.duration(600).delay(500)}>
            <Button
              title="Get Started"
              variant="navy"
              size="large"
              onPress={handleGetStarted}
            />
            <Text className="font-comfortaa text-xs text-neutral-gray text-center mt-4">
              By continuing, you agree to our Terms of Service
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  )
}
