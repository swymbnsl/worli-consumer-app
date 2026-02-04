import { Transaction } from "@/types/database.types"
import { formatFullDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatters"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react-native"
import React from "react"
import { Text, View } from "react-native"

interface TransactionListProps {
  transactions: Transaction[]
}

export default function TransactionList({
  transactions,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <View className="bg-white mx-4 rounded-2xl p-6 mb-8 shadow-md">
        <Text className="font-sofia-bold text-lg text-primary-navy mb-5">
          Recent Transactions
        </Text>
        <Text className="font-comfortaa text-sm text-neutral-gray text-center py-5">
          No transactions yet
        </Text>
      </View>
    )
  }

  return (
    <View className="bg-white mx-4 rounded-2xl p-6 mb-8 shadow-md">
      <Text className="font-sofia-bold text-lg text-primary-navy mb-5">
        Recent Transactions
      </Text>
      {transactions.slice(0, 10).map((txn, idx) => {
        const isCredit = txn.type === "credit"
        return (
          <View
            key={txn.id}
            className={`flex-row justify-between items-center py-4 ${
              idx < Math.min(9, transactions.length - 1)
                ? "border-b border-neutral-lightGray"
                : ""
            }`}
          >
            <View className="flex-row items-center gap-3 flex-1">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  isCredit
                    ? "bg-functional-success/10"
                    : "bg-functional-error/10"
                }`}
              >
                {isCredit ? (
                  <ArrowDownLeft size={18} color="#638C5F" strokeWidth={2.5} />
                ) : (
                  <ArrowUpRight size={18} color="#EF6600" strokeWidth={2.5} />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-comfortaa text-sm font-semibold text-primary-navy mb-1 capitalize">
                  {txn.type}
                </Text>
                {txn.description && (
                  <Text className="font-comfortaa text-xs text-neutral-gray mb-1">
                    {txn.description}
                  </Text>
                )}
                <Text className="font-comfortaa text-xs text-neutral-gray">
                  {formatFullDate(txn.created_at || "")}
                </Text>
              </View>
            </View>
            <Text
              className={`font-sofia-bold text-lg ${
                isCredit ? "text-functional-success" : "text-functional-error"
              }`}
            >
              {isCredit ? "+" : "-"}
              {formatCurrency(txn.amount)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
