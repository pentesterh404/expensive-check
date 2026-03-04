import "server-only";

import fs from "node:fs";
import path from "node:path";

export const RUNTIME_CONFIG_KEYS = [
  "NEXT_PUBLIC_BASE_URL",
  "TELEGRAM_BOT_USERNAME",
  "TELEGRAM_BOT_TOKEN"
] as const;

export type RuntimeConfigKey = (typeof RUNTIME_CONFIG_KEYS)[number];
export type RuntimeConfig = Record<RuntimeConfigKey, string>;

const ENV_FILE = path.join(process.cwd(), ".env");

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvText(text: string): Record<string, string> {
  const output: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1);
    output[key] = stripWrappingQuotes(rawValue);
  }
  return output;
}

function readEnvFileValues(): Record<string, string> {
  try {
    if (!fs.existsSync(ENV_FILE)) return {};
    const text = fs.readFileSync(ENV_FILE, "utf8");
    return parseEnvText(text);
  } catch {
    return {};
  }
}

function encodeEnvValue(value: string) {
  return JSON.stringify(value ?? "");
}

function updateEnvText(text: string, updates: Partial<RuntimeConfig>) {
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) return line;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!RUNTIME_CONFIG_KEYS.includes(key as RuntimeConfigKey)) return line;
    if (!(key in updates)) return line;

    if (seen.has(key)) return "";
    seen.add(key);
    return `${key}=${encodeEnvValue(String(updates[key as RuntimeConfigKey] ?? ""))}`;
  });

  for (const key of RUNTIME_CONFIG_KEYS) {
    if (!(key in updates)) continue;
    if (seen.has(key)) continue;
    nextLines.push(`${key}=${encodeEnvValue(String(updates[key] ?? ""))}`);
  }

  return `${nextLines.filter(Boolean).join("\n").replace(/\n+$/g, "")}\n`;
}

export function getRuntimeConfig(): RuntimeConfig {
  const envFileValues = readEnvFileValues();
  return {
    NEXT_PUBLIC_BASE_URL: (envFileValues.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "").trim(),
    TELEGRAM_BOT_USERNAME: (
      envFileValues.TELEGRAM_BOT_USERNAME ??
      process.env.TELEGRAM_BOT_USERNAME ??
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
      ""
    ).trim(),
    TELEGRAM_BOT_TOKEN: (envFileValues.TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN ?? "").trim()
  };
}

export async function updateRuntimeConfig(updates: Partial<RuntimeConfig>) {
  const current = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
  const next = updateEnvText(current, updates);
  await fs.promises.writeFile(ENV_FILE, next, "utf8");
  return getRuntimeConfig();
}
