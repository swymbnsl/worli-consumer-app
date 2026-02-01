// ============================================
// Account Components Types
// ============================================

export interface MenuItem {
  id: string
  label: string
  icon: any
  color: string
  route?: string
  action?: () => void
}

export interface MenuListProps {
  items: MenuItem[]
}

export interface ProfileHeaderProps {
  user: any // Use User type from database.types.ts
}

// ============================================
// Wallet Components Types
// ============================================

export interface WalletBalanceCardProps {
  balance: number
}

export interface WalletSettingsCardProps {
  onRecharge: () => void
  onSettings: () => void
}

export interface TransactionListProps {
  transactions: any[] // Use Transaction type from database.types.ts
}

export interface RechargeModalProps {
  visible: boolean
  onClose: () => void
  onRecharge: (amount: number) => void
}

export interface SettingsModalProps {
  visible: boolean
  onClose: () => void
  onUpdate: (settings: any) => void
}

// ============================================
// Subscription Components Types
// ============================================

export interface SubscriptionCardProps {
  subscription: any // Use Subscription type from database.types.ts
  onEdit: () => void
  onPause: () => void
}

export interface PausedDatesListProps {
  pausedDates: string[]
  onRemove: (date: string) => void
}

export interface EditModalProps {
  visible: boolean
  subscription: any
  onClose: () => void
  onSave: (data: any) => void
}

export interface PauseModalProps {
  visible: boolean
  subscription: any
  onClose: () => void
  onPause: (dates: string[]) => void
}

// ============================================
// Orders Components Types
// ============================================

export interface OrderCardProps {
  order: any // Use Order type from database.types.ts
  onPress: () => void
}

// ============================================
// Addresses Components Types
// ============================================

export interface AddressCardProps {
  address: any // Use Address type from database.types.ts
  onEdit: () => void
  onDelete: () => void
  onSelect?: () => void
  isSelected?: boolean
}

export interface AddEditAddressModalProps {
  visible: boolean
  address?: any
  onClose: () => void
  onSave: (address: any) => void
}

// ============================================
// Cart Components Types
// ============================================

export interface DatePickerModalProps {
  visible: boolean
  onClose: () => void
  onSelectDate: (date: Date) => void
  minDate?: Date
  maxDate?: Date
}

// ============================================
// Home Components Types
// ============================================

export interface PremiumCardProps {
  onPress: () => void
}

export interface BottleReturnAlertProps {
  bottleCount: number
  onPress: () => void
}

export interface DeliveryCalendarProps {
  deliveries: any[]
  onDatePress?: (date: Date) => void
}

export interface StatsCardsProps {
  stats: {
    activeSubscriptions: number
    pendingOrders: number
    walletBalance: number
  }
}

// ============================================
// UI Components Types
// ============================================

export interface HeaderProps {
  title?: string
  showBackButton?: boolean
  rightComponent?: React.ReactNode
}
