"use client"

function isIOSBrowser() {
  if (typeof window === "undefined") {
    return false
  }

  const userAgent = window.navigator.userAgent
  const platform = window.navigator.platform
  const maxTouchPoints = window.navigator.maxTouchPoints ?? 0

  return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)
}

export function canUseDocumentFullscreen() {
  if (typeof document === "undefined") {
    return false
  }

  const documentElement = document.documentElement

  return Boolean(
    document.fullscreenEnabled &&
      typeof documentElement?.requestFullscreen === "function" &&
      typeof document.exitFullscreen === "function" &&
      !isIOSBrowser()
  )
}
