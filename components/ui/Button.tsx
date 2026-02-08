import { ButtonProps } from "@/types/ui-components.types"
import React from "react"
import { ActivityIndicator, Text, TouchableOpacity } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

export default function Button({
  title,
  variant = "primary",
  size = "medium",
  isLoading = false,
  animationDelay = 0,
  fullWidth = true,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-primary-orange"
      case "navy":
        return "bg-primary-navy"
      case "secondary":
        return "bg-secondary-sage"
      case "danger":
        return "bg-functional-error"
      case "outline":
        return "bg-transparent border-2 border-primary-navy"
      default:
        return "bg-primary-orange"
    }
  }

  const getTextClasses = () => {
    switch (variant) {
      case "primary":
        return "text-white font-sofia-bold"
      case "navy":
        return "text-white font-sofia-bold"
      case "secondary":
        return "text-white font-sofia-bold"
      case "danger":
        return "text-white font-sofia-bold"
      case "outline":
        return "text-primary-navy font-sofia-bold"
      default:
        return "text-white font-sofia-bold"
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return "py-2 px-4"
      case "medium":
        return "py-4 px-6"
      case "large":
        return "py-5 px-8"
      default:
        return "py-4 px-6"
    }
  }

  const getTextSizeClasses = () => {
    switch (size) {
      case "small":
        return "text-sm"
      case "medium":
        return "text-base"
      case "large":
        return "text-lg"
      default:
        return "text-base"
    }
  }

  const baseClasses = `rounded-xl items-center justify-center ${getSizeClasses()} ${getVariantClasses()}`
  const widthClasses = fullWidth ? "w-full" : ""
  const disabledClasses = disabled || isLoading ? "opacity-50" : ""
  const shadowClasses = variant !== "outline" ? "shadow-md" : ""

  const buttonClasses =
    `${baseClasses} ${widthClasses} ${disabledClasses} ${shadowClasses} ${className || ""}`.trim()

  const AnimatedView = animationDelay > 0 ? Animated.View : React.Fragment
  const animationProps =
    animationDelay > 0
      ? { entering: FadeInUp.duration(300).delay(animationDelay) }
      : {}

  const buttonContent = (
    <TouchableOpacity
      className={buttonClasses}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === "outline" ? "#101B53" : "#FFFFFF"}
          size="small"
        />
      ) : (
        <Text className={`${getTextClasses()} ${getTextSizeClasses()}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )

  if (animationDelay > 0) {
    return <AnimatedView {...animationProps}>{buttonContent}</AnimatedView>
  }

  return buttonContent
}
