export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "₹0"
  return `₹${amount.toLocaleString("en-IN")}`
}

export const formatPhone = (phone: string | null | undefined): string => {
  // Format: +91 98765 43210
  if (!phone) return ""
  if (phone.startsWith("+91")) {
    const digits = phone.slice(3)
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return phone
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}
