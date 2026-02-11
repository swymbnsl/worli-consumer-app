import { Image } from "expo-image"
import React from "react"
import { Text, View } from "react-native"

interface ProductImageProps {
  imageUrl: string | null
  size?: "small" | "medium" | "large"
  containerClassName?: string
}

export default function ProductImage({
  imageUrl,
  size = "medium",
  containerClassName,
}: ProductImageProps) {
  const sizeClasses = {
    small: "w-12 h-12",
    medium: "w-14 h-14",
    large: "w-52 h-52",
  }

  const imageSizes = {
    small: { width: 35, height: 35 },
    medium: { width: 40, height: 40 },
    large: { width: 180, height: 180 },
  }

  return (
    <View
      className={`${sizeClasses[size]} rounded-xl bg-primary-cream items-center justify-center ${containerClassName || ""}`}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={imageSizes[size]}
          contentFit="contain"
          transition={200}
        />
      ) : (
        <Text className="text-2xl text-neutral-gray">📦</Text>
      )}
    </View>
  )
}
