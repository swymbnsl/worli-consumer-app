import { COLORS } from "@/constants/theme";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

interface AccountSubHeaderProps {
  title: string;
}

export default function AccountSubHeader({ title }: AccountSubHeaderProps) {
  const router = useRouter();
  return (
    <View
      className="bg-neutral-lightCream px-4 pb-3 flex-row items-center"
      style={{ paddingTop: Platform.OS === "ios" ? 54 : 42 }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        className="mr-3"
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <ChevronLeft size={20} color={COLORS.primary.navy} strokeWidth={2.5} />
      </TouchableOpacity>
      <View className="flex-1 items-center mr-9">
        <Text className="font-sofia-bold text-lg text-primary-navy" numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}
