import { COLORS } from "@/constants/theme"
import { ChevronDown, ChevronUp } from "lucide-react-native"
import React, { useState } from "react"
import { ScrollView, Text, TouchableOpacity, View } from "react-native"

export default function FAQScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: "How do I place an order?",
      answer:
        'You can place an order by navigating to the Home screen and clicking on "Order Now". Select your quantity and delivery date, then proceed to checkout.',
    },
    {
      question: "What are the delivery timings?",
      answer:
        "We deliver fresh milk daily between 6:00 AM to 8:00 AM. You can modify your delivery preferences in your account settings.",
    },
    {
      question: "How do I pause my subscription?",
      answer:
        'Go to the Subscription tab, tap on "Pause", and select the dates you want to pause. You can pause up to 7 days in advance.',
    },
    {
      question: "How do I add money to my wallet?",
      answer:
        'Navigate to the Wallet tab and tap on "Add Money". Enter the amount you want to add and complete the payment using your preferred method.',
    },
    {
      question: "What if I need to return bottles?",
      answer:
        'You can mark bottles as returned in the Orders section. Simply tap on the order and click "Mark as Returned". Our delivery person will collect empty bottles during the next delivery.',
    },
    {
      question: "Can I change my delivery address?",
      answer:
        "Yes, go to Account > Manage Addresses to add, edit, or delete delivery addresses. You can set a default address for regular deliveries.",
    },
    {
      question: "What payment methods are accepted?",
      answer:
        "We accept UPI, Credit/Debit Cards, Net Banking, and Wallet payments. All transactions are secure and encrypted.",
    },
    {
      question: "How do I cancel my subscription?",
      answer:
        'Go to the Subscription tab and scroll down to find the "Cancel Subscription" button. Please note that you need to clear any pending bottle returns before cancellation.',
    },
  ]

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-comfortaa text-base text-neutral-gray mb-6 leading-6">
          Find answers to frequently asked questions below
        </Text>

        {faqs.map((faq, index) => (
          <View
            key={index}
            className="bg-white rounded-2xl mb-3 overflow-hidden shadow-md"
          >
            <TouchableOpacity
              className="p-5 flex-row justify-between items-center active:bg-neutral-lightCream"
              onPress={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
            >
              <Text className="flex-1 font-sofia-bold text-base text-primary-navy mr-3">
                {faq.question}
              </Text>
              {expandedIndex === index ? (
                <ChevronUp size={20} color={COLORS.primary.orange} />
              ) : (
                <ChevronDown size={20} color={COLORS.neutral.gray} />
              )}
            </TouchableOpacity>

            {expandedIndex === index && (
              <View className="px-5 pb-5 border-t border-neutral-lightGray">
                <Text className="font-comfortaa text-sm text-neutral-darkGray leading-5 mt-3">
                  {faq.answer}
                </Text>
              </View>
            )}
          </View>
        ))}

        <View className="h-8" />
      </ScrollView>
    </View>
  )
}
