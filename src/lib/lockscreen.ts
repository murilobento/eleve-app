export const IDLE_TIMEOUT_MS = 15 * 60 * 1000
export const LOCK_STORAGE_KEY = "app:lockscreen:locked-at"
export const LAST_ACTIVITY_STORAGE_KEY = "app:lockscreen:last-active-at"
export const FAILED_ATTEMPTS_STORAGE_KEY = "app:lockscreen:failed-attempts"
export const MANUAL_LOCK_EVENT = "app:lockscreen:manual-lock"

export function triggerManualLock() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(LOCK_STORAGE_KEY, String(Date.now()))
  window.dispatchEvent(new Event(MANUAL_LOCK_EVENT))
}
