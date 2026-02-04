import Button from "@/components/ui/Button"
import { router } from "expo-router"
import React from "react"
import { StatusBar, Text, View } from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"
import { SafeAreaView } from "react-native-safe-area-context"

export default function Onboarding() {
  const handleGetStarted = () => {
    router.push("/(auth)/login")
  }

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-lightCream"
      edges={["top", "bottom"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F0" />

      <View className="flex-1 justify-between px-6 py-8">
        {/* Top Section - Logo and Illustration */}
        <View className="flex-1 items-center justify-center">
          <Animated.View
            entering={FadeInDown.duration(600).delay(100)}
            className="items-center"
          >
            {/* Logo */}
            <View className="w-28 h-28 rounded-3xl bg-primary-orange items-center justify-center mb-8 shadow-lg">
              <Text className="text-7xl">🥛</Text>
            </View>

            {/* Brand Name */}
            <Text className="font-sofia-bold text-5xl text-primary-navy mb-3 tracking-wider">
              Worli Dairy
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-gray tracking-widest uppercase">
              Premium Fresh Milk
            </Text>
          </Animated.View>
        </View>

        {/* Middle Section - Features */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(300)}
          className="mb-12"
        >
          <View className="bg-white rounded-2xl p-6 shadow-md">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-secondary-sage/10 items-center justify-center mr-4">
                <Text className="text-xl">🌅</Text>
              </View>
              <View className="flex-1">
                <Text className="font-sofia-bold text-base text-primary-navy">
                  Daily Fresh Delivery
                </Text>
                <Text className="font-comfortaa text-xs text-neutral-gray">
                  Farm fresh milk at your doorstep every morning
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-primary-orange/10 items-center justify-center mr-4">
                <Text className="text-xl">🔔</Text>
              </View>
              <View className="flex-1">
                <Text className="font-sofia-bold text-base text-primary-navy">
                  Flexible Subscriptions
                </Text>
                <Text className="font-comfortaa text-xs text-neutral-gray">
                  Pause, modify or cancel anytime
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-functional-success/10 items-center justify-center mr-4">
                <Text className="text-xl">♻️</Text>
              </View>
              <View className="flex-1">
                <Text className="font-sofia-bold text-base text-primary-navy">
                  Eco-Friendly Glass Bottles
                </Text>
                <Text className="font-comfortaa text-xs text-neutral-gray">
                  Returnable bottles for a greener planet
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Bottom Section - CTA */}
        <Animated.View entering={FadeInUp.duration(600).delay(500)}>
          <Button
            title="Get Started"
            variant="primary"
            size="large"
            onPress={handleGetStarted}
          />
          <Text className="font-comfortaa text-xs text-neutral-gray text-center mt-4">
            By continuing, you agree to our Terms of Service
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
