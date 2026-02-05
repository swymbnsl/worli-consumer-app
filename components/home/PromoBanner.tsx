import { Offer } from "@/types/database.types"
import { Image } from "expo-image"
import React, { useRef } from "react"
import { Dimensions, TouchableOpacity, View } from "react-native"
import { useSharedValue } from "react-native-reanimated"
import Carousel, {
  ICarouselInstance,
  Pagination,
} from "react-native-reanimated-carousel"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const ITEM_WIDTH = SCREEN_WIDTH * 0.8 // 80% of screen width for main item
const BANNER_HEIGHT = 150

// Local carousel images
const CAROUSEL_IMAGES = [
  require("@/assets/images/carousel/1.png"),
  require("@/assets/images/carousel/2.png"),
  require("@/assets/images/carousel/3.png"),
  require("@/assets/images/carousel/4.png"),
]

interface CarouselItem {
  id: string
  image: any
  offer?: Offer
}

interface PromoBannerProps {
  offers?: Offer[]
  onPressOffer?: (offer: Offer) => void
  autoScrollInterval?: number
}

export default function PromoBanner({
  offers = [],
  onPressOffer,
  autoScrollInterval = 4000,
}: PromoBannerProps) {
  const carouselRef = useRef<ICarouselInstance>(null)
  const progressValue = useSharedValue<number>(0)

  // Create carousel items from local images
  const carouselItems: CarouselItem[] = CAROUSEL_IMAGES.map((image, index) => ({
    id: `carousel-${index + 1}`,
    image,
    offer: offers[index], // Link to offer if available
  }))

  const onPressPagination = (index: number) => {
    carouselRef.current?.scrollTo({
      count: index - progressValue.value,
      animated: true,
    })
  }
  const renderItem = ({ item }: { item: CarouselItem; index: number }) => {
    return (
      <View
        className="py-3"
        style={{
          width: ITEM_WIDTH,
          height: BANNER_HEIGHT,
          paddingHorizontal: 6,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => item.offer && onPressOffer?.(item.offer)}
          style={{
            flex: 1,
            borderRadius: 20,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Image
            source={item.image}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex justify-center items-center">
      <Carousel
        ref={carouselRef}
        loop
        width={ITEM_WIDTH}
        height={BANNER_HEIGHT}
        autoPlay={true}
        autoPlayInterval={autoScrollInterval}
        data={carouselItems}
        scrollAnimationDuration={800}
        onProgressChange={(_, absoluteProgress) => {
          progressValue.value = absoluteProgress
        }}
        renderItem={renderItem}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 1,
          parallaxScrollingOffset: 0,
          parallaxAdjacentItemScale: 1,
        }}
        style={{
          width: SCREEN_WIDTH,
          justifyContent: "center",
          alignItems: "center",
        }}
        containerStyle={{}}
      />
      <Pagination.Basic
        progress={progressValue}
        data={carouselItems}
        dotStyle={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#D1D5DB", // neutral-lightGray
        }}
        activeDotStyle={{
          backgroundColor: "#101B53", // primary-navy
        }}
        containerStyle={{
          gap: 8,
          marginTop: 8,
        }}
        onPress={onPressPagination}
      />
    </View>
  )
}
