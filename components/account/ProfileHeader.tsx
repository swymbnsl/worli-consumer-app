import { Edit2 } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { User } from '@/types/database.types';
import { formatPhone } from '@/utils/formatters';

interface ProfileHeaderProps {
  user: User | null;
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  if (!user) return null;

  return (
    <View className="bg-primary-navy px-4 pt-8 pb-8 items-center">
      <View className="relative mb-4">
        <View className="w-24 h-24 rounded-3xl bg-primary-cream items-center justify-center border-4 border-white shadow-lg">
          <Text className="text-4xl">👤</Text>
        </View>
        <TouchableOpacity className="absolute -bottom-2 -right-2 bg-primary-orange w-10 h-10 rounded-xl items-center justify-center border-2 border-white shadow-sm">
           <Edit2 size={16} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
      
      <Text className="font-sofia-bold text-2xl text-white mb-1">
        {user.name}
      </Text>
      <Text className="font-comfortaa text-sm text-white/70 tracking-widest">
        {formatPhone(user.phone)}
      </Text>
    </View>
  );
}