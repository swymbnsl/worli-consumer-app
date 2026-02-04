// Re-export all types from supabase.types.ts for convenience
import { Tables, TablesInsert, TablesUpdate } from "./supabase.types"

// Main types from database tables
export type User = Tables<"users">
export type Address = Tables<"addresses">
export type Subscription = Tables<"subscriptions">
export type Order = Tables<"orders">
export type Wallet = Tables<"wallets">
export type Transaction = Tables<"transactions">
export type Product = Tables<"products">
export type Notification = Tables<"notifications">
export type UserPreference = Tables<"user_preferences">
export type DeliveryPreference = Tables<"delivery_preferences">
export type Offer = Tables<"offers">
export type FAQ = Tables<"faqs">
export type SupportTicket = Tables<"support_tickets">
export type BottleReturn = Tables<"bottle_returns">
export type SubscriptionHold = Tables<"subscription_holds">
export type Referral = Tables<"referrals">
export type AppSetting = Tables<"app_settings">

// Insert types for creating new records
export type UserInsert = TablesInsert<"users">
export type AddressInsert = TablesInsert<"addresses">
export type SubscriptionInsert = TablesInsert<"subscriptions">
export type OrderInsert = TablesInsert<"orders">
export type WalletInsert = TablesInsert<"wallets">
export type TransactionInsert = TablesInsert<"transactions">

// Update types for updating existing records
export type UserUpdate = TablesUpdate<"users">
export type AddressUpdate = TablesUpdate<"addresses">
export type SubscriptionUpdate = TablesUpdate<"subscriptions">
export type WalletUpdate = TablesUpdate<"wallets">
