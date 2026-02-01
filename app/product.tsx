import { useRouter } from 'expo-router';
import { CheckCircle, ChevronLeft } from 'lucide-react-native';
import React from 'react';
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PRODUCT } from '@/constants/product';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';

export default function ProductScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: COLORS.secondary,
          paddingHorizontal: SPACING.xxl,
          paddingTop: 56,
          paddingBottom: SPACING.xxxl,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <ChevronLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View>
          <Text
            style={{
              color: COLORS.text.bright,
              fontSize: 13,
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            PRODUCT
          </Text>
          <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: '700' }}>
            Details
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Product Image Section */}
        <View
          style={{
            backgroundColor: COLORS.white,
            alignItems: 'center',
            paddingVertical: 60,
          }}
        >
          <View
            style={{
              width: 200,
              height: 200,
              borderRadius: 60,
              backgroundColor: '#FFF0D2',
              alignItems: 'center',
              justifyContent: 'center',
              ...SHADOWS.lg,
            }}
          >
            <Text style={{ fontSize: 120 }}>{PRODUCT.image}</Text>
          </View>
        </View>

        {/* Product Details Section */}
        <View
          style={{
            backgroundColor: COLORS.white,
            paddingHorizontal: 28,
            paddingTop: 32,
            paddingBottom: 40,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: COLORS.secondary,
              marginBottom: 8,
            }}
          >
            {PRODUCT.name}
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text.secondary, marginBottom: 20 }}>
            {PRODUCT.size}
          </Text>
          <Text
            style={{
              fontSize: 36,
              fontWeight: '700',
              color: COLORS.primary,
              marginBottom: 28,
            }}
          >
            {formatCurrency(PRODUCT.price)}
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: COLORS.text.secondary,
              lineHeight: 24,
              marginBottom: 32,
            }}
          >
            {PRODUCT.description}
          </Text>

          {/* Key Features */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: COLORS.secondary,
              marginBottom: 20,
            }}
          >
            Key Features
          </Text>
          {PRODUCT.features.map((feature, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: BORDER_RADIUS.sm,
                  backgroundColor: '#E8F5E9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <CheckCircle size={18} color={COLORS.accent} />
              </View>
              <Text
                style={{ fontSize: 15, color: COLORS.secondary, fontWeight: '500' }}
              >
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Nutritional Information */}
        <View
          style={{
            backgroundColor: COLORS.white,
            marginHorizontal: SPACING.xxl,
            marginTop: 16,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.xxl,
            marginBottom: 20,
            ...SHADOWS.md,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: COLORS.secondary,
              marginBottom: 16,
            }}
          >
            Nutritional Information
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.text.secondary,
              marginBottom: 12,
            }}
          >
            Per 100ml serving
          </Text>

          {[
            { label: 'Energy', value: '66 kcal' },
            { label: 'Protein', value: '3.2g' },
            { label: 'Fat', value: '3.5g' },
            { label: 'Carbohydrates', value: '4.8g' },
            { label: 'Calcium', value: '120mg' },
            { label: 'Vitamin D', value: '0.1µg' },
          ].map((nutrient, idx, arr) => (
            <View key={idx}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: COLORS.text.secondary, fontSize: 14 }}>
                  {nutrient.label}
                </Text>
                <Text
                  style={{
                    fontWeight: '600',
                    color: COLORS.secondary,
                    fontSize: 14,
                  }}
                >
                  {nutrient.value}
                </Text>
              </View>
              {idx < arr.length - 1 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: COLORS.border,
                    marginVertical: 4,
                  }}
                />
              )}
            </View>
          ))}
        </View>

        {/* Delivery Information */}
        <View
          style={{
            backgroundColor: COLORS.white,
            marginHorizontal: SPACING.xxl,
            marginTop: 0,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.xxl,
            marginBottom: 20,
            ...SHADOWS.md,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: COLORS.secondary,
              marginBottom: 16,
            }}
          >
            Delivery Information
          </Text>

          {[
            {
              title: 'Fresh Daily Delivery',
              description: 'Delivered fresh every morning between 6:00 AM - 8:00 AM',
            },
            {
              title: 'Glass Bottle Packaging',
              description: 'Eco-friendly glass bottles that preserve freshness and taste',
            },
            {
              title: 'Easy Returns',
              description: 'Return empty bottles during your next delivery',
            },
            {
              title: 'Quality Guaranteed',
              description: '100% satisfaction guarantee or full refund',
            },
          ].map((info, idx) => (
            <View
              key={idx}
              style={{
                marginBottom: idx < 3 ? 20 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: COLORS.secondary,
                  marginBottom: 4,
                }}
              >
                {info.title}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.text.secondary,
                  lineHeight: 18,
                }}
              >
                {info.description}
              </Text>
            </View>
          ))}
        </View>

        {/* Add to Cart Button */}
        <View style={{ paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.xxxl }}>
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: BORDER_RADIUS.sm,
              paddingVertical: 20,
              alignItems: 'center',
              ...SHADOWS.primary,
            }}
            onPress={() => router.push('/cart')}
          >
            <Text
              style={{ color: COLORS.white, fontWeight: '700', fontSize: 18 }}
            >
              Add to Cart
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}