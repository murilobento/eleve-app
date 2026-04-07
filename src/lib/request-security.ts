export const CLIENT_IP_HEADERS = ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"] as const;

function getHeaderValue(headers: Headers, headerName: string) {
  const value = headers.get(headerName);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIp(value: string) {
  const candidate = value.split(",")[0]?.trim() ?? "";
  return candidate.length > 0 ? candidate : null;
}

export function getClientIpFromHeaders(headers: Headers) {
  for (const headerName of CLIENT_IP_HEADERS) {
    const candidate = normalizeIp(getHeaderValue(headers, headerName));
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

export function getClientIp(request: Request) {
  return getClientIpFromHeaders(request.headers);
}

export function getRequestPath(request: Request) {
  return new URL(request.url).pathname;
}

export function getRequestOrigin(request: Request) {
  return request.headers.get("origin");
}
