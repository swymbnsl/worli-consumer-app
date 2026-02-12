export default {
  expo: {
    name: "Worli Dairy",
    slug: "worli-dairy",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/splash-icon.jpg",
    scheme: "worli-dairy",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.worlidairy",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "We need your location to set your delivery address.",
      },
    },
    android: {
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.anonymous.worlidairy",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.jpg",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "f1c5f043-1515-4bbe-b787-927e8a05eb9f",
      },
    },
  },
}
