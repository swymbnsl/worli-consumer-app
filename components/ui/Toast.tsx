import { COLORS } from "@/constants/theme"
import {
  AlertTriangle,
  CheckCircle,
  CircleAlert,
  Info,
  X,
} from "lucide-react-native"
import React, { useEffect, useRef, useState } from "react"
import {
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type ToastType = "success" | "error" | "info" | "warning"

interface ToastProps {
  message: string
  description?: string
  type: ToastType
  duration?: number
}

interface ToastState extends ToastProps {
  visible: boolean
}

// Create a single instance for the toast
let toastInstance: {
  show: (props: ToastProps) => void
  hide: () => void
} | null = null

const ToastIcon = ({
  type,
  color,
  size = 24,
}: {
  type: ToastType
  color: string
  size?: number
}) => {
  switch (type) {
    case "success":
      return <CheckCircle size={size} color={color} strokeWidth={2.2} />
    case "error":
      return <CircleAlert size={size} color={color} strokeWidth={2.2} />
    case "warning":
      return <AlertTriangle size={size} color={color} strokeWidth={2.2} />
    case "info":
    default:
      return <Info size={size} color={color} strokeWidth={2.2} />
  }
}

const ToastComponent = () => {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    description: "",
    type: "info",
    visible: false,
    duration: 3000,
  })

  const slideAnim = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()
  const { width } = Dimensions.get("window")
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    toastInstance = {
      show: (props: ToastProps) => {
        if (timeout.current) {
          clearTimeout(timeout.current)
          timeout.current = null
        }

        setToast({
          ...props,
          visible: true,
        })

        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start()

        timeout.current = setTimeout(() => {
          hideToast()
        }, props.duration || 3000)
      },

      hide: () => {
        hideToast()
      },
    }

    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current)
      }
      toastInstance = null
    }
  }, [])

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    })
  }

  // Background color for each type
  const getBackgroundColor = (): string => {
    switch (toast.type) {
      case "success":
        return COLORS.functional.success
      case "error":
        return COLORS.functional.error
      case "warning":
        return COLORS.functional.warning
      case "info":
      default:
        return COLORS.functional.info
    }
  }

  // Text color for each type
  const getTextColor = (): string => {
    switch (toast.type) {
      case "warning":
      case "info":
        return COLORS.neutral.black
      case "success":
      case "error":
      default:
        return COLORS.neutral.white
    }
  }

  // Description text color for each type
  const getDescriptionColor = (): string => {
    switch (toast.type) {
      case "warning":
      case "info":
        return COLORS.neutral.darkGray
      case "success":
      case "error":
      default:
        return COLORS.neutral.lightCream
    }
  }

  if (!toast.visible) return null

  const iconColor =
    toast.type === "warning" || toast.type === "info"
      ? COLORS.neutral.black
      : COLORS.neutral.white

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        width,
        paddingTop: insets.top,
        backgroundColor: getBackgroundColor(),
        shadowColor: COLORS.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        transform: [{ translateY: slideAnim }],
        opacity,
      }}
      className="rounded-b-2xl"
    >
      <View className="flex-row items-center px-4 py-3">
        <ToastIcon type={toast.type} color={iconColor} size={24} />
        <View className="flex-1 mx-3">
          <Text
            className="font-sofia-bold text-base"
            style={{
              color: getTextColor(),
              fontSize: 15,
            }}
          >
            {toast.message}
          </Text>
          {toast.description && (
            <Text
              className="font-comfortaa text-sm mt-0.5"
              style={{
                color: getDescriptionColor(),
                fontSize: 13,
              }}
            >
              {toast.description}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={hideToast}>
          <X size={24} color={iconColor} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

// Toast wrapper functions
export const showToast = (props: ToastProps) => {
  if (toastInstance) {
    toastInstance.show(props)
  }
}

export const showSuccessToast = (message: string, description?: string) => {
  showToast({
    message,
    description,
    type: "success",
  })
}

export const showErrorToast = (message: string, description?: string) => {
  showToast({
    message,
    description,
    type: "error",
  })
}

export const showInfoToast = (message: string, description?: string) => {
  showToast({
    message,
    description,
    type: "info",
  })
}

export const showWarningToast = (message: string, description?: string) => {
  showToast({
    message,
    description,
    type: "warning",
  })
}

export const Toast = ToastComponent
