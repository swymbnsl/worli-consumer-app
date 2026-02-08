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
    />
  );
}
