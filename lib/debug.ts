function parseBoolean(value: string | null | undefined): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function isDebugEnabledFromUrl(url: string): boolean | null {
  try {
    const parsed = new URL(url);
    return parseBoolean(parsed.searchParams.get("debug"));
  } catch {
    return null;
  }
}

export function isDebugEnabled(req?: Request): boolean {
  const requestFlag = req ? isDebugEnabledFromUrl(req.url) : null;
  if (requestFlag !== null) return requestFlag;
  const envFlag = parseBoolean(process.env.DEBUG);
  return envFlag ?? false;
}
