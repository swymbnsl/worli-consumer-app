import { Clock } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { COLORS } from "@/constants/theme"

export default function CutoffTimer() {
  const [timeLeft, setTimeLeft] = useState("")
  const [isPastCutoff, setIsPastCutoff] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      // Convert to IST (UTC + 5:30)
      const istOffsetMs = 5.5 * 60 * 60 * 1000
      const nowIst = new Date(now.getTime() + istOffsetMs)
      
      const cutoffIst = new Date(nowIst)
      cutoffIst.setUTCHours(19, 0, 0, 0) // 19:00 IST is 7 PM IST
      
      let pastCutoff = nowIst.getTime() > cutoffIst.getTime()
      
      if (pastCutoff) {
        // Cutoff is tomorrow at 7 PM IST
        cutoffIst.setUTCDate(cutoffIst.getUTCDate() + 1)
      }
      
      setIsPastCutoff(pastCutoff)
      
      const diffMs = cutoffIst.getTime() - nowIst.getTime()
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      
      setTimeLeft(`${diffHrs}h ${diffMins}m`)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 60000) // update every minute
    return () => clearInterval(interval)
  }, [])

  return (
    <Animated.View entering={FadeInDown.duration(400)} className="mx-4 mt-4 mb-2">
      <View className="bg-secondary-skyBlue/10 border border-secondary-skyBlue/20 rounded-xl p-3 flex-row items-center">
        <View className="w-8 h-8 rounded-full bg-secondary-skyBlue/20 items-center justify-center mr-3">
          <Clock size={16} color={COLORS.secondary.skyBlue} />
        </View>
        <View className="flex-1">
          <Text className="font-sofia-bold text-sm text-secondary-skyBlue mb-0.5">
            {isPastCutoff ? "Next order changes close in:" : "Tomorrow's order changes close in:"}
          </Text>
          <Text className="font-comfortaa text-xs text-neutral-darkGray">
            <Text className="font-sofia-bold text-primary-navy">{timeLeft}</Text>
            {isPastCutoff ? " (Cutoff passed for tomorrow)" : " (Cutoff is 7 PM daily)"}
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}