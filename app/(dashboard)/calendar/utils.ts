export function getAvatarInitials(name?: string | null) {
  if (!name?.trim()) {
    return "?";
  }

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
