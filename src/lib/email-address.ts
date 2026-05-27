export function extractEmailAddress(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/);
  return (match?.[1] || trimmed).trim();
}
