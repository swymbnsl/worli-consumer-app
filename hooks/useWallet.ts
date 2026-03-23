import { useWalletStore } from "@/stores/wallet-store"

export const useWallet = () => {
  return useWalletStore()
}
