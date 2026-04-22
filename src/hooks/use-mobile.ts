import * as React from "react"

const MOBILE_BREAKPOINT = 768

function isLikelyTouchMobile() {
  if (typeof window === "undefined") {
    return false
  }

  const userAgent = window.navigator.userAgent
  const platform = window.navigator.platform
  const maxTouchPoints = window.navigator.maxTouchPoints ?? 0
  const isAppleTouchDevice =
    /iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)

  return isAppleTouchDevice || /Android/i.test(userAgent)
}

function getViewportWidth() {
  if (typeof window === "undefined") {
    return MOBILE_BREAKPOINT
  }

  const visualViewportWidth = window.visualViewport?.width ?? Number.POSITIVE_INFINITY
  const innerWidth = window.innerWidth
  const clientWidth = document.documentElement.clientWidth
  const screenWidth = window.screen.width

  return Math.min(visualViewportWidth, innerWidth, clientWidth, screenWidth)
}

function getIsMobileViewport() {
  const viewportWidth = getViewportWidth()

  if (viewportWidth < MOBILE_BREAKPOINT) {
    return true
  }

  return isLikelyTouchMobile() && viewportWidth < 1024
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(() => getIsMobileViewport())

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(getIsMobileViewport())
    }

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange)
    } else {
      mql.addListener(onChange)
    }

    window.addEventListener("resize", onChange)
    window.visualViewport?.addEventListener("resize", onChange)

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onChange)
      } else {
        mql.removeListener(onChange)
      }

      window.removeEventListener("resize", onChange)
      window.visualViewport?.removeEventListener("resize", onChange)
    }
  }, [])

  return !!isMobile
}
