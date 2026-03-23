import { create } from "zustand"
import * as Network from "expo-network"

interface NetworkState {
  isConnected: boolean
  checkConnection: () => Promise<void>
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true,

  checkConnection: async () => {
    try {
      const networkState = await Network.getNetworkStateAsync()
      set({ isConnected: networkState.isConnected ?? true })
    } catch (error) {
      console.error("Network check failed:", error)
      set({ isConnected: true })
    }
  },
}))

let intervalId: ReturnType<typeof setInterval> | null = null

export const startNetworkPolling = () => {
  if (intervalId) return
  // Initial check
  useNetworkStore.getState().checkConnection()
  // Poll periodically
  intervalId = setInterval(() => {
    useNetworkStore.getState().checkConnection()
  }, 5000)
}

export const stopNetworkPolling = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}
