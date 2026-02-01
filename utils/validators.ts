export const validatePhone = (phone: string): boolean => {
  // Must be 10 digits
  return /^\d{10}$/.test(phone);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateOTP = (otp: string): boolean => {
  // Must be 4 digits
  return /^\d{4}$/.test(otp);
};

export const validatePincode = (pincode: string): boolean => {
  // Must be 6 digits
  return /^\d{6}$/.test(pincode);
};
