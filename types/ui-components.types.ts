import { TextInputProps, TouchableOpacityProps, ViewProps } from "react-native"

// Button Component Types
export interface ButtonProps extends TouchableOpacityProps {
  title: string
  variant?: "primary" | "secondary" | "danger" | "outline" | "navy"
  size?: "small" | "medium" | "large"
  isLoading?: boolean
  animationDelay?: number
  fullWidth?: boolean
}

// TextInput Component Types
export interface CustomTextInputProps extends TextInputProps {
  label?: string
  prefix?: string
  suffix?: string
  animationDelay?: number
  error?: string
  containerClassName?: string
}

// PageHeader Component Types
export interface PageHeaderProps {
  title: string
  subtitle?: string
  showBackButton?: boolean
  disabled?: boolean
  onBackPress?: () => void
  rightComponent?: React.ReactNode
  backgroundColor?: string
  animationDelay?: number
}

// InfoCard Component Types
export interface InfoCardProps {
  label: string
  value: string
  animationDelay?: number
  variant?: "default" | "large" | "compact"
  isLoading?: boolean
  backgroundColor?: string
  icon?: React.ReactNode
}

// AnimatedView Component Types
export type AnimationType =
  | "fadeInUp"
  | "fadeInDown"
  | "fadeInLeft"
  | "fadeInRight"
  | "slideInUp"
  | "slideInDown"
  | "slideInLeft"
  | "slideInRight"

export interface AnimatedViewProps extends ViewProps {
  animation?: AnimationType
  delay?: number
  duration?: number
  children: React.ReactNode
}
