export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  language: 'english' | 'hindi' | 'kannada';
  delivery_preference: 'ring_doorbell' | 'drop_at_door' | 'hand_delivery';
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  type: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  quantity: number;
  frequency: string;
  start_date: string;
  status: string;
  next_delivery: string | null;
  paused_dates: string[];
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  date: string;
  quantity: number;
  amount: number;
  status: string;
  bottle_returned: boolean;
  delivery_time: string | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  auto_pay_enabled: boolean;
  auto_pay_threshold: number;
  low_balance_alert: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  type: 'recharge' | 'debit';
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
}

