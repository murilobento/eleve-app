import fs from "node:fs";
import os from "node:os";

function isExecutablePath(path: string) {
  return Boolean(path) && fs.existsSync(path);
}

export function resolvePdfBrowserExecutablePath() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.GOOGLE_CHROME_BIN;

  if (fromEnv && isExecutablePath(fromEnv)) {
    return fromEnv;
  }

  const platform = os.platform();
  const candidates =
    platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            "/snap/bin/chromium",
            "/opt/google/chrome/chrome",
            "/usr/bin/microsoft-edge",
          ];

  const discovered = candidates.find((candidate) => isExecutablePath(candidate));

  if (discovered) {
    return discovered;
  }

  throw new Error(
    "Could not find Chrome/Chromium executable for PDF generation. Configure PUPPETEER_EXECUTABLE_PATH.",
  );
}

