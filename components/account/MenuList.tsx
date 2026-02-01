import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  color: string;
  route?: string;
  action?: () => void;
}

interface MenuListProps {
  items: MenuItem[];
}

export default function MenuList({ items }: MenuListProps) {
  const router = useRouter();

  const handlePress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.route) {
        // @ts-ignore
      router.push(item.route);
    }
  };

  return (
    <View className="bg-white mx-4 rounded-2xl px-4 shadow-sm">
      {items.map((item, index) => {
        const IconComponent = item.icon;
        const isLastItem = index === items.length - 1;
        const isLogout = item.id === 'logout';
        const isDelete = item.id === 'delete';
        const isDanger = isLogout || isDelete;

        const textColorClass = isDanger ? 'text-functional-error' : 'text-primary-navy';
        const iconColor = isDanger ? '#FF4444' : '#101B53';

        return (
          <TouchableOpacity
            key={item.id}
            className={`flex-row items-center justify-between py-4 ${!isLastItem ? 'border-b border-neutral-lightGray' : ''}`}
            onPress={() => handlePress(item)}
            activeOpacity={0.6}
          >
            <View className="flex-row items-center gap-3">
              <IconComponent size={20} color={iconColor} strokeWidth={2} />
              <Text className={`font-comfortaa text-sm ${textColorClass}`}>
                {item.label}
              </Text>
            </View>
            <ChevronRight size={18} color="#B3B3B3" strokeWidth={2} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}