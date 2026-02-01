import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const success = await updateUser({ name, email });
      if (success) {
        Alert.alert('Success', 'Profile updated successfully');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
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
            Settings
          </Text>
          <Text className="font-sofia-bold text-2xl text-white">
            Edit Profile
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl p-7 mb-8 shadow-md">
          <Text className="font-comfortaa text-xs font-semibold text-primary-navy mb-3 uppercase tracking-wide">
            Full Name
          </Text>
          <TextInput
            className="bg-white border-2 border-neutral-lightGray rounded-xl px-5 py-4 mb-6 font-comfortaa text-base text-primary-navy"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#B3B3B3"
          />

          <Text className="font-comfortaa text-xs font-semibold text-primary-navy mb-3 uppercase tracking-wide">
            Phone Number
          </Text>
          <TextInput
            className="bg-neutral-lightGray border-2 border-neutral-lightGray rounded-xl px-5 py-4 mb-6 font-comfortaa text-base text-neutral-gray"
            value={user?.phone}
            editable={false}
          />

          <Text className="font-comfortaa text-xs font-semibold text-primary-navy mb-3 uppercase tracking-wide">
            Email Address
          </Text>
          <TextInput
            className="bg-white border-2 border-neutral-lightGray rounded-xl px-5 py-4 mb-6 font-comfortaa text-base text-primary-navy"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="Enter your email"
            placeholderTextColor="#B3B3B3"
          />

          <TouchableOpacity
            className={`rounded-xl py-4 items-center shadow-md ${
              loading ? 'bg-neutral-gray opacity-50' : 'bg-primary-orange active:opacity-90'
            }`}
            onPress={handleSave}
            disabled={loading}
          >
            <Text className="font-sofia-bold text-base text-white">
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}