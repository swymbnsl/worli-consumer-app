declare module "react-native-razorpay" {
  interface RazorpayCheckoutOptions {
    key: string
    amount: string
    currency: string
    name: string
    description?: string
    image?: string
    order_id: string
    prefill?: {
      name?: string
      email?: string
      contact?: string
    }
    notes?: Record<string, string>
    theme?: {
      color?: string
    }
    modal?: {
      confirm_close?: boolean
      ondismiss?: () => void
    }
    subscription_id?: string
    recurring?: boolean
  }

  interface RazorpayPaymentResponse {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
    razorpay_subscription_id?: string
  }

  interface RazorpayCheckout {
    open(options: RazorpayCheckoutOptions): Promise<RazorpayPaymentResponse>
  }

  const RazorpayCheckout: RazorpayCheckout
  export default RazorpayCheckout
}
