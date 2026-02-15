import { OfflineScreen } from "@/components/common"
import * as Network from "expo-network"
import React, { createContext, useContext, useEffect, useState } from "react"

interface NetworkContextType {
  isConnected: boolean
  checkConnection: () => Promise<void>
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  checkConnection: async () => {},
})

export const useNetwork = () => useContext(NetworkContext)

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true)

  const checkConnection = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync()
      setIsConnected(networkState.isConnected ?? true)
    } catch (error) {
      console.error("Network check failed:", error)
      // On error, assume connected to avoid blocking user unnecessarily
      setIsConnected(true)
    }
  }

  useEffect(() => {
    // Initial check
    checkConnection()

    // Poll periodically since expo-network doesn't have a listener for Android
    // (though on some platforms it might support it, polling is a safe fallback)
    const interval = setInterval(checkConnection, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!isConnected) {
    return <OfflineScreen onRetry={checkConnection} isLoading={!isConnected} />
  }

  return (
    <NetworkContext.Provider value={{ isConnected, checkConnection }}>
      {children}
    </NetworkContext.Provider>
  )
}
