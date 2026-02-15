import Button from "@/components/ui/Button"
import { COLORS } from "@/constants/theme"
import { X } from "lucide-react-native"
import React, { useEffect, useRef } from "react"
import {
  Animated,
  Dimensions,
  Pressable,
  Modal as RNModal,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export interface ModalButton {
  text: string
  onPress: () => void
  variant?: "primary" | "secondary" | "outline" | "danger" | "navy"
  destructive?: boolean
}

interface ModalProps {
  visible: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  buttons?: ModalButton[]
  showCloseButton?: boolean
  closeOnBackdropPress?: boolean
  width?: number | string
}

export default function Modal({
  visible,
  onClose,
  title,
  description,
  children,
  buttons,
  showCloseButton = true,
  closeOnBackdropPress = true,
  width,
}: ModalProps) {
  const { width: screenWidth } = Dimensions.get("window")
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose()
    }
  }

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          opacity: fadeAnim,
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={handleBackdropPress}
        >
          <View className="flex-1 justify-center items-center px-4">
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{ width: width || screenWidth - 64 }}
            >
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnim }],
                }}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-1 pr-4">
                      {title && (
                        <Text className="font-sofia-bold text-2xl text-primary-navy">
                          {title}
                        </Text>
                      )}
                    </View>
                    {showCloseButton && (
                      <TouchableOpacity
                        onPress={onClose}
                        className="p-1 -mt-1 -mr-1"
                      >
                        <X
                          size={24}
                          color={COLORS.neutral.darkGray}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Description */}
                {description && (
                  <Text className="font-comfortaa text-base text-neutral-darkGray mb-4">
                    {description}
                  </Text>
                )}

                {/* Custom Content */}
                {children && <View className="mb-4">{children}</View>}

                {/* Buttons */}
                {buttons && buttons.length > 0 && (
                  <View
                    className={`flex-row gap-3 mt-2`}
                  >
                    {buttons.map((button, index) => (
                      <View
                        key={index}
                        className="flex-1"
                      >
                        <Button
                          title={button.text}
                          onPress={button.onPress}
                          variant={button.variant || "primary"}
                          fullWidth
                          className={
                            button.variant === "outline"
                              ? ""
                              : "border-2 border-transparent"
                          }
                        />
                      </View>
                    ))}
                  </View>
                )}
              </Animated.View>
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    </RNModal>
  )
}

// ─────────────────────────────────────────
// Confirmation Modal Helper
// ─────────────────────────────────────────
interface ConfirmModalProps {
  visible: boolean
  onClose: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  destructive?: boolean
}

export function ConfirmModal({
  visible,
  onClose,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  destructive = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      description={description}
      buttons={[
        {
          text: cancelText,
          onPress: onClose,
          variant: "outline",
        },
        {
          text: confirmText,
          onPress: handleConfirm,
          variant: "navy",
          destructive,
        },
      ]}
      showCloseButton={false}
    />
  )
}
