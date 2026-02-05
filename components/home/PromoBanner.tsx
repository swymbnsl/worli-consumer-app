import { Offer } from "@/types/database.types"
import { Image } from "expo-image"
import React, { useEffect, useRef, useState } from "react"
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const BANNER_WIDTH = SCREEN_WIDTH - 32 // 16px padding on each side
const BANNER_HEIGHT = 180

interface PromoBannerProps {
  offers: Offer[]
  onPressOffer?: (offer: Offer) => void
  autoScrollInterval?: number
}

export default function PromoBanner({
  offers,
  onPressOffer,
  autoScrollInterval = 4000,
}: PromoBannerProps) {
  const flatListRef = useRef<FlatList>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-scroll functionality
  useEffect(() => {
    if (offers.length <= 1) return

    const startAutoScroll = () => {
      autoScrollTimerRef.current = setInterval(() => {
        const nextIndex = (activeIndex + 1) % offers.length
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        })
        setActiveIndex(nextIndex)
      }, autoScrollInterval)
    }

    startAutoScroll()

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current)
      }
    }
  }, [activeIndex, offers.length, autoScrollInterval])

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x
    const index = Math.round(scrollPosition / BANNER_WIDTH)
    if (index !== activeIndex && index >= 0 && index < offers.length) {
      setActiveIndex(index)
    }
  }

  const handleScrollBeginDrag = () => {
    // Stop auto-scroll when user starts dragging
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current)
    }
  }

  const renderBanner = ({ item, index }: { item: Offer; index: number }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => onPressOffer?.(item)}
        style={{ width: BANNER_WIDTH }}
      >
        <Animated.View
          entering={FadeIn.delay(index * 100).duration(300)}
          className="bg-white rounded-2xl overflow-hidden shadow-md"
          style={{ height: BANNER_HEIGHT }}
        >
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            // Fallback banner design when no image
            <View className="flex-1 flex-row bg-gradient-to-r from-primary-cream to-white p-5">
              {/* Left side - Product visualization */}
              <View className="flex-1 justify-center items-center">
                <View className="bg-white rounded-2xl p-4 shadow-sm">
                  <Text className="text-5xl">🥛</Text>
                </View>
              </View>

              {/* Right side - Offer details */}
              <View className="flex-1 justify-center pl-4">
                <Text className="font-sofia-bold text-xl text-primary-navy mb-2">
                  {item.title}
                </Text>
                {item.description && (
                  <Text
                    className="font-comfortaa text-sm text-neutral-gray mb-3"
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                )}
                {item.discount_percentage && (
                  <View className="bg-primary-orange rounded-full px-3 py-1 self-start">
                    <Text className="font-sofia-bold text-white text-sm">
                      {item.discount_percentage}% OFF
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    )
  }

  // Empty state
  if (!offers || offers.length === 0) {
    return null
  }

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={renderBanner}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEventThrottle={16}
        snapToInterval={BANNER_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        getItemLayout={(_, index) => ({
          length: BANNER_WIDTH + 12,
          offset: (BANNER_WIDTH + 12) * index,
          index,
        })}
        onScrollToIndexFailed={() => {}}
      />

      {/* Pagination Dots */}
      {offers.length > 1 && (
        <View className="flex-row justify-center items-center mt-4 gap-2">
          {offers.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                flatListRef.current?.scrollToIndex({ index, animated: true })
                setActiveIndex(index)
              }}
            >
              <View
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex
                    ? "bg-primary-navy w-6"
                    : "bg-neutral-lightGray w-2"
                }`}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}
