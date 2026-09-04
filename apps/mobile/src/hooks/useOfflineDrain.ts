import { useEffect, useRef } from "react"
import { useNetworkState } from "expo-network"
import { drain } from "@/utils/offlineQueue"

/**
 * Fires the offline queue drain whenever the device transitions
 * from offline → online. Idempotent — safe to call on every render.
 */
export function useOfflineDrain(): void {
  const wasOffline = useRef(false)
  const network = useNetworkState()

  useEffect(() => {
    const isOnline = network.isConnected === true
    if (isOnline && wasOffline.current) {
      wasOffline.current = false
      drain().catch(() => {
        // drain failures are silent; items stay in outbox for next opportunity
      })
    } else if (!isOnline) {
      wasOffline.current = true
    }
  }, [network.isConnected])
}
