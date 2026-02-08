import AccountSubHeader from "@/components/account/AccountSubHeader";
import { Stack } from "expo-router";
import React from "react";

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        header: (props) => (
          <AccountSubHeader title={props.options.title || props.route.name} />
        ),
        headerShown: true,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="profile" options={{ title: "Edit Profile" }} />
      <Stack.Screen name="addresses" options={{ title: "Manage Addresses" }} />
      <Stack.Screen name="delivery" options={{ title: "Delivery Preferences" }} />
      <Stack.Screen name="transactions" options={{ title: "Transaction History" }} />
      <Stack.Screen name="language" options={{ title: "Language" }} />
      <Stack.Screen name="refer" options={{ title: "Refer & Earn" }} />
      <Stack.Screen name="faq" options={{ title: "FAQ" }} />
      <Stack.Screen name="contact" options={{ title: "Contact Us" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy Policy" }} />
      <Stack.Screen name="terms" options={{ title: "Terms & Conditions" }} />
      <Stack.Screen name="delete" options={{ title: "Delete Account" }} />
    </Stack>
  );
}
