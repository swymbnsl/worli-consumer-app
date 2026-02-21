/**
 * NTP Time Service
 *
 * Provides tamper-proof time using NTP (Network Time Protocol).
 * The app uses this instead of `new Date()` for all cutoff-related logic,
 * so users cannot bypass the 7 PM ordering cutoff by changing their device clock.
 */
import NTPSync from "@ruanitto/react-native-ntp-sync"

// ─── Constants ────────────────────────────────────────────────────────────────

/** Ordering cutoff hour in 24h format (19 = 7 PM) */
export const CUTOFF_HOUR = 19

/** IST offset in minutes (+5:30) */
const IST_OFFSET_MINUTES = 5 * 60 + 30

// ─── Singleton NTP Client ─────────────────────────────────────────────────────

let ntpClient: NTPSync | null = null

/**
 * Initialize NTP sync. Call once at app startup (e.g. in _layout.tsx).
 * The client auto-syncs every 5 minutes by default.
 */
export function initNtpSync(): void {
  if (ntpClient) return

  ntpClient = new NTPSync({
    servers: [
      { server: "time.google.com", port: 123 },
      { server: "time.cloudflare.com", port: 123 },
      { server: "time.windows.com", port: 123 },
      { server: "0.pool.ntp.org", port: 123 },
    ],
    syncOnCreation: true,
    autoSync: true,
    history: 10,
  })
}

/**
 * Update NTP client's network status.
 * Call this when the device goes online/offline.
 */
export function setNtpOnline(isOnline: boolean): void {
  ntpClient?.setIsOnline(isOnline)
}

// ─── Time Getters ─────────────────────────────────────────────────────────────

/**
 * Get the current NTP-corrected Date object.
 * Falls back to device time if NTP hasn't synced yet.
 */
export function getNtpNow(): Date {
  if (!ntpClient) {
    return new Date()
  }
  const ntpTimestamp = ntpClient.getTime()
  return new Date(ntpTimestamp)
}

/**
 * Get current time converted to IST (Indian Standard Time).
 * Returns a Date adjusted to IST regardless of device timezone.
 */
function getNtpNowIST(): Date {
  const now = getNtpNow()
  // Convert to UTC, then add IST offset
  const utcMs =
    now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const istMs = utcMs + IST_OFFSET_MINUTES * 60 * 1000
  return new Date(istMs)
}

/**
 * Check if the current NTP time is past the ordering cutoff (7 PM IST).
 */
export function isPastCutoff(): boolean {
  const istNow = getNtpNowIST()
  return istNow.getHours() >= CUTOFF_HOUR
}

/**
 * Get tomorrow's date string (YYYY-MM-DD) based on IST.
 */
export function getTomorrowDateNtp(): string {
  const istNow = getNtpNowIST()
  const tomorrow = new Date(istNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDateStr(tomorrow)
}

/**
 * Get day-after-tomorrow's date string (YYYY-MM-DD) based on IST.
 */
export function getDayAfterTomorrowDateNtp(): string {
  const istNow = getNtpNowIST()
  const dayAfter = new Date(istNow)
  dayAfter.setDate(dayAfter.getDate() + 2)
  return formatDateStr(dayAfter)
}

/**
 * Get today's date string (YYYY-MM-DD) based on IST.
 */
export function getTodayDateNtp(): string {
  return formatDateStr(getNtpNowIST())
}

/**
 * Check if a given date string (YYYY-MM-DD) is tomorrow (IST).
 */
export function isTomorrowNtp(dateStr: string): boolean {
  return dateStr === getTomorrowDateNtp()
}

/**
 * Get the weekday index (0=Sun, 1=Mon, ..., 6=Sat) for tomorrow in IST.
 */
export function getTomorrowWeekdayNtp(): number {
  const istNow = getNtpNowIST()
  const tomorrow = new Date(istNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.getDay()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
