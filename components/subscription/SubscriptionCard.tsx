import { PRODUCT } from '@/constants/product';
import { Subscription } from '@/types/database.types';
import { formatDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';
import { Calendar, Clock, Edit3, Package, PauseCircle } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: () => void;
  onPause: () => void;
}

export default function SubscriptionCard({ subscription, onEdit, onPause }: SubscriptionCardProps) {
  return (
    <View className="mx-4 mt-4">
      {/* Active Status Badge */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="font-sofia-bold text-xl text-primary-navy">
          Active Plan
        </Text>
        <View className="bg-secondary-sage/20 px-4 py-2 rounded-full">
          <Text className="font-sofia-bold text-xs text-secondary-sage tracking-wider">
            ACTIVE
          </Text>
        </View>
      </View>

      {/* Subscription Card */}
      <View className="bg-white rounded-2xl p-5 shadow-md mb-4">
        {/* Product Info */}
        <View className="flex-row items-center mb-4 pb-4 border-b border-neutral-lightGray">
          <View className="bg-secondary-skyBlue/10 p-3 rounded-xl mr-3">
            <Package size={24} color="#A1C3E3" strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="font-comfortaa text-xs text-neutral-gray mb-1">
              Product
            </Text>
            <Text className="font-sofia-bold text-base text-primary-navy">
              {PRODUCT.name}
            </Text>
          </View>
        </View>

        {/* Subscription Details */}
        <View className="space-y-3">
          <DetailRow 
            label="Daily Quantity" 
            value={`${subscription.quantity} Bottles`}
          />
          <DetailRow 
            label="Frequency" 
            value={subscription.frequency.charAt(0).toUpperCase() + subscription.frequency.slice(1)} 
          />
          <DetailRow 
            icon={<Calendar size={16} color="#638C5F" strokeWidth={2} />}
            label="Next Delivery" 
            value={subscription.next_delivery ? formatDate(subscription.next_delivery) : 'N/A'} 
          />
          {subscription.delivery_time && (
            <DetailRow 
              icon={<Clock size={16} color="#A1C3E3" strokeWidth={2} />}
              label="Delivery Time" 
              value={subscription.delivery_time} 
            />
          )}
          
          {/* Daily Cost - Highlighted */}
          <View className="bg-neutral-lightCream/50 rounded-xl p-4 mt-2">
            <View className="flex-row justify-between items-center">
              <Text className="font-comfortaa text-sm text-neutral-gray">
                Daily Cost
              </Text>
              <Text className="font-sofia-bold text-xl text-primary-navy">
                {formatCurrency(PRODUCT.price * subscription.quantity)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 bg-primary-navy py-3 rounded-2xl items-center justify-center shadow-sm flex-row"
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Edit3 size={16} color="white" strokeWidth={2} />
          <Text className="font-sofia-bold text-sm text-white ml-2">
            Edit Plan
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="flex-1 bg-white py-3 rounded-2xl items-center justify-center border-2 border-secondary-sage shadow-sm flex-row"
          onPress={onPause}
          activeOpacity={0.8}
        >
          <PauseCircle size={16} color="#638C5F" strokeWidth={2} />
          <Text className="font-sofia-bold text-sm text-secondary-sage ml-2">
            Pause
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Helper Component
function DetailRow({ 
  label, 
  value,
  icon
}: { 
  label: string; 
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <View className="flex-row justify-between items-center py-2">
      <View className="flex-row items-center">
        {icon && <View className="mr-2">{icon}</View>}
        <Text className="font-comfortaa text-sm text-neutral-gray">
          {label}
        </Text>
      </View>
      <Text className="font-sofia-bold text-base text-neutral-darkGray">
        {value}
      </Text>
    </View>
  );
}

