import { useRouter } from 'expo-router';
import { CheckCircle, ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

export default function LanguageScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const languages = [
    { id: 'english', label: 'English', nativeLabel: 'English' },
    { id: 'hindi', label: 'Hindi', nativeLabel: 'हिंदी' },
    { id: 'kannada', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  ];

  const handleSelect = async (langId: string) => {
    await updateUser({ language: langId as any });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-lightCream" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F0" />

      {/* Header */}
      <View className="bg-primary-navy px-6 pt-10 pb-6 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 active:opacity-70">
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text className="font-comfortaa text-xs text-primary-cream uppercase tracking-widest mb-1">
            Preferences
          </Text>
          <Text className="font-sofia-bold text-2xl text-white">
            Language
          </Text>
        </View>
      </View>

      <View className="px-6 pt-6">
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.id}
            className={`bg-white rounded-2xl p-6 mb-4 shadow-md flex-row justify-between items-center active:opacity-80 ${
              user?.language === lang.id ? 'border-2 border-primary-orange' : ''
            }`}
            onPress={() => handleSelect(lang.id)}
          >
            <View>
              <Text className="font-sofia-bold text-lg text-primary-navy mb-1">
                {lang.label}
              </Text>
              <Text className="font-comfortaa text-sm text-neutral-darkGray">
                {lang.nativeLabel}
              </Text>
            </View>
            {user?.language === lang.id && (
              <CheckCircle size={28} color="#EF6600" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}