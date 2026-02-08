import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface AccountSubHeaderProps {
  title: string;
}

export default function AccountSubHeader({ title }: AccountSubHeaderProps) {
  const router = useRouter();
  return (
    <View className="bg-primary-navy px-4 pt-10 pb-4 flex-row items-center">
      <TouchableOpacity
        onPress={() => router.back()}
        className="mr-3 active:opacity-70 p-1"
      >
        <ChevronLeft size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <Text className="font-sofia-bold text-lg text-white" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}
