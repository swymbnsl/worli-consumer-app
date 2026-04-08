// ============================================================================
// Bottle Utilities
// Conversion and calculation functions for bottle-based wallet system
// ============================================================================

import { Subscription } from "@/types/database.types"

// ─── Conversion Functions ────────────────────────────────────────────────────

/**
 * Convert amount in rupees to number of bottles
 */
export function amountToBottles(amount: number, bottlePrice: number): number {
  if (!bottlePrice || bottlePrice <= 0) return 0
  return Math.floor(amount / bottlePrice)
}

/**
 * Convert number of bottles to amount in rupees
 */
export function bottlesToAmount(bottles: number, bottlePrice: number): number {
  return bottles * bottlePrice
}

// ─── Days Left Calculations ──────────────────────────────────────────────────

/**
 * Calculate daily bottle consumption from all active subscriptions
 * Returns average bottles consumed per day
 */
export function calculateDailyConsumption(subscriptions: Subscription[]): number {
  let totalBottlesPerMonth = 0

  for (const sub of subscriptions) {
    if (sub.status !== "active") continue

    const quantity = sub.quantity || 1

    switch (sub.frequency) {
      case "daily":
        // Daily delivery
        totalBottlesPerMonth += quantity * 30
        break

      case "custom":
        // Custom per-day quantities
        if (sub.custom_quantities) {
          const weeklyTotal = Object.values(sub.custom_quantities).reduce(
            (sum: number, q: number) => sum + q,
            0
          )
          totalBottlesPerMonth += weeklyTotal * 4 // ~4 weeks per month
        }
        break

      case "on_interval":
        // Every X days
        if (sub.interval_days && sub.interval_days > 0) {
          const deliveriesPerMonth = Math.floor(30 / sub.interval_days)
          totalBottlesPerMonth += quantity * deliveriesPerMonth
        }
        break

      case "buy_once":
        // One-time - doesn't affect ongoing consumption
        break

      default:
        // Default to daily
        totalBottlesPerMonth += quantity * 30
    }
  }

  // Convert monthly consumption to daily
  return totalBottlesPerMonth / 30
}

/**
 * Calculate approximate days left based on bottle balance and subscriptions
 */
export function calculateDaysLeft(
  bottleBalance: number,
  subscriptions: Subscription[]
): number {
  const dailyConsumption = calculateDailyConsumption(subscriptions)

  if (dailyConsumption <= 0) {
    // No active subscriptions consuming bottles
    return bottleBalance > 0 ? Infinity : 0
  }

  return Math.floor(bottleBalance / dailyConsumption)
}

/**
 * Format days left for display
 */
export function formatDaysLeft(days: number): string {
  if (days === Infinity || days > 365) {
    return "No active subscriptions"
  }
  if (days <= 0) {
    return "Recharge needed"
  }
  if (days === 1) {
    return "~1 day left"
  }
  if (days < 7) {
    return `~${days} days left`
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `~${weeks} ${weeks === 1 ? "week" : "weeks"} left`
  }
  const months = Math.floor(days / 30)
  return `~${months} ${months === 1 ? "month" : "months"} left`
}

// ─── Subscription Days Left ──────────────────────────────────────────────────

/**
 * Calculate days left for a specific subscription based on start date and end date
 */
export function calculateSubscriptionDaysLeft(subscription: Subscription): number {
  const startDate = new Date(subscription.start_date)
  
  // Use end_date if available, otherwise assume 1 month subscription
  let endDate: Date
  if (subscription.end_date) {
    endDate = new Date(subscription.end_date)
  } else {
    // Default to 1 month if no end_date
    endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
  }
  
  // Calculate days remaining
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const diffMs = endDate.getTime() - today.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  return Math.max(0, daysLeft)
}

/**
 * Format subscription days left for display
 */
export function formatSubscriptionDaysLeft(subscription: Subscription): string {
  const daysLeft = calculateSubscriptionDaysLeft(subscription)
  
  if (daysLeft <= 0) {
    return "Ended"
  }
  if (daysLeft === 1) {
    return "1 day left"
  }
  if (daysLeft < 7) {
    return `${daysLeft} days left`
  }
  if (daysLeft < 30) {
    const weeks = Math.floor(daysLeft / 7)
    const remainingDays = daysLeft % 7
    if (remainingDays === 0) {
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} left`
    }
    return `${weeks}w ${remainingDays}d left`
  }
  const months = Math.floor(daysLeft / 30)
  const remainingDays = daysLeft % 30
  if (remainingDays === 0) {
    return `${months} ${months === 1 ? "month" : "months"} left`
  }
  return `${months}m ${Math.floor(remainingDays / 7)}w left`
}

// ─── Total Bottles Calculation ───────────────────────────────────────────────

/**
 * Calculate total bottles for a subscription configuration
 */
export function calculateTotalBottles(
  frequency: string,
  quantity: number,
  durationMonths: number,
  intervalDays: number | null,
  customQuantities: Record<string, number> | null
): number {
  if (frequency === "daily") {
    return quantity * 30 * durationMonths
  } else if (frequency === "custom" && customQuantities) {
    const weeklyTotal = Object.values(customQuantities).reduce((sum, q) => sum + q, 0)
    return weeklyTotal * 4 * durationMonths
  } else if (frequency === "on_interval" && intervalDays) {
    return quantity * Math.floor(30 / intervalDays) * durationMonths
  } else if (frequency === "buy_once") {
    return quantity
  } else {
    return quantity * 30 * durationMonths
  }
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Format bottle count for display
 */
export function formatBottles(count: number): string {
  if (count === 1) {
    return "1 bottle"
  }
  return `${count} bottles`
}

/**
 * Format bottle count with short label
 */
export function formatBottlesShort(count: number): string {
  return `${count}`
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Check if amount is valid for bottle purchase (integral multiple of bottle price)
 */
export function isValidBottleAmount(amount: number, bottlePrice: number): boolean {
  if (amount <= 0 || bottlePrice <= 0) return false
  return amount % bottlePrice === 0
}

/**
 * Get nearest valid bottle amount (rounds up)
 */
export function getNearestValidAmount(amount: number, bottlePrice: number): number {
  if (amount <= 0 || bottlePrice <= 0) return bottlePrice
  const bottles = Math.ceil(amount / bottlePrice)
  return bottles * bottlePrice
}
