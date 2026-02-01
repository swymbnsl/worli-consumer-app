
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Order, Subscription } from '../../types/database.types';
import { getDaysArray } from '../../utils/dateUtils';

interface DeliveryCalendarProps {
  orders: Order[];
  subscriptions: Subscription[];
}

export default function DeliveryCalendar({ orders, subscriptions }: DeliveryCalendarProps) {
  const days = getDaysArray(14, -7);
  const today = new Date().toISOString().split('T')[0];

  const getOrderStatus = (date: string) => {
    // Check if date is paused
    const isPaused = subscriptions.some(sub => 
      sub.paused_dates?.includes(date)
    );
    if (isPaused) return 'paused';

    // Check if order exists and is delivered
    const order = orders.find(o => o.date === date);
    if (order && order.status === 'delivered') return 'delivered';

    // Check if future date
    if (new Date(date) > new Date(today)) return 'upcoming';

    return null;
  };

  return (
    <View className="bg-primary-cream rounded-2xl p-4 shadow-sm">
      <Text className="font-sofia-bold text-lg text-primary-navy mb-4 ml-2">
        Delivery Timeline
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}
      >
        {days.map((date, idx) => {
          const status = getOrderStatus(date);
          const dateObj = new Date(date);
          const day = dateObj.getDate();
          const dayName = dateObj
            .toLocaleDateString('en-IN', { weekday: 'short' })
            .toUpperCase();
          const isToday = date === today;

          let bgClass = "bg-white";
          let textClass = "text-neutral-darkGray"; // Default text color
          let dayNameClass = "text-neutral-gray";

          if (isToday) {
             bgClass = "bg-primary-navy"; // Highlight today
             textClass = "text-white";
             dayNameClass = "text-white/70";
          } else if (status === 'delivered') {
             // Use a dot or something? Or change background?
             // Section 4.6 uses colored dots in legend, but logic inside map says isToday bg-blue-500.
             // I will stick to clean bg-white with status indicators or let the status dictate color.
             // Let's use the status colors for the whole bubble for clarity as per previous design but cleaner.
             // Actually 4.6 example: date.isToday ? 'bg-blue-500' : 'bg-white'
          }

          return (
            <View
              key={idx}
              className={`items-center w-16 py-3 rounded-xl ${bgClass} ${status === 'delivered' ? 'border-2 border-functional-success' : ''}`}
            >
              <Text className={`font-comfortaa text-xs mb-1 ${dayNameClass}`}>
                {dayName}
              </Text>
              <Text className={`font-sofia-bold text-xl ${textClass}`}>
                {day}
              </Text>
              
              {/* Status Dot */}
              <View className="mt-2">
                {status === 'delivered' && <View className="w-2 h-2 rounded-full bg-functional-success" />}
                {status === 'upcoming' && <View className="w-2 h-2 rounded-full bg-secondary-skyBlue" />}
                {status === 'paused' && <View className="w-2 h-2 rounded-full bg-neutral-gray" />}
              </View>
            </View>
          );
        })}
      </ScrollView>
      
      {/* Legend */}
      <View className="flex-row justify-center mt-4 gap-4">
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 rounded-full bg-functional-success" />
          <Text className="font-comfortaa text-xs text-neutral-darkGray">Delivered</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 rounded-full bg-secondary-skyBlue" />
          <Text className="font-comfortaa text-xs text-neutral-darkGray">Upcoming</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 rounded-full bg-neutral-gray" />
          <Text className="font-comfortaa text-xs text-neutral-darkGray">Paused</Text>
        </View>
      </View>
    </View>
  );
}
