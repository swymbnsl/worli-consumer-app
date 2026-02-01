import React from "react"
import {
  TextInput as RNTextInput,
  Text,
  TextInputProps,
  View,
} from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

interface CustomTextInputProps extends TextInputProps {
  label?: string
  prefix?: string
  suffix?: string
  animationDelay?: number
  error?: string
  containerClassName?: string
}

export default function TextInput({
  label,
  prefix,
  suffix,
  animationDelay = 0,
  error,
  className,
  containerClassName,
  style,
  ...props
}: CustomTextInputProps) {
  const AnimatedView = animationDelay > 0 ? Animated.View : View
  const animationProps =
    animationDelay > 0
      ? { entering: FadeInUp.duration(300).delay(animationDelay) }
      : {}

  return (
    <AnimatedView
      className={`mb-4 ${containerClassName || ""}`}
      {...animationProps}
    >
      {label && (
        <Text className="text-primary-navy text-xs font-comfortaa font-semibold mb-3 uppercase tracking-wide">
          {label}
        </Text>
      )}
      <View
        className={`bg-white border-2 ${error ? "border-functional-error" : "border-neutral-lightGray"} rounded-xl px-4 py-4 flex-row items-center`}
      >
        {prefix && (
          <Text className="text-neutral-darkGray font-comfortaa text-base font-medium mr-2">
            {prefix}
          </Text>
        )}
        <RNTextInput
          placeholderTextColor="#B3B3B3"
          className={`flex-1 font-comfortaa text-base text-neutral-nearBlack ${className || ""}`}
          style={style}
          {...props}
        />
        {suffix && (
          <Text className="text-neutral-darkGray font-comfortaa text-base font-medium ml-2">
            {suffix}
          </Text>
        )}
      </View>
      {error && (
        <Text className="text-functional-error text-xs font-comfortaa mt-1">
          {error}
        </Text>
      )}
    </AnimatedView>
  )
}
