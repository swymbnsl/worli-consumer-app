import React from "react"
import { ViewProps } from "react-native"
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
} from "react-native-reanimated"

type AnimationType =
  | "fadeInUp"
  | "fadeInDown"
  | "fadeInLeft"
  | "fadeInRight"
  | "slideInUp"
  | "slideInDown"
  | "slideInLeft"
  | "slideInRight"

interface AnimatedViewProps extends ViewProps {
  animation?: AnimationType
  delay?: number
  duration?: number
  children: React.ReactNode
}

export default function AnimatedView({
  animation = "fadeInUp",
  delay = 0,
  duration = 300,
  children,
  ...props
}: AnimatedViewProps) {
  const getAnimation = (): any => {
    let anim: any

    switch (animation) {
      case "fadeInUp":
        anim = FadeInUp
        break
      case "fadeInDown":
        anim = FadeInDown
        break
      case "fadeInLeft":
        anim = FadeInLeft
        break
      case "fadeInRight":
        anim = FadeInRight
        break
      case "slideInUp":
        anim = SlideInUp
        break
      case "slideInDown":
        anim = SlideInDown
        break
      case "slideInLeft":
        anim = SlideInLeft
        break
      case "slideInRight":
        anim = SlideInRight
        break
      default:
        anim = FadeInUp
    }

    if (delay > 0) {
      anim = anim.delay(delay)
    }

    if (duration) {
      anim = anim.duration(duration)
    }

    return anim
  }

  return (
    <Animated.View entering={getAnimation()} {...props}>
      {children}
    </Animated.View>
  )
}
