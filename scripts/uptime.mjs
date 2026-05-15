#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultServicesPath = resolve(__dirname, "..", "data", "services.yaml");

export function parseServicesYaml(text) {
  const services = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trimEnd();
    if (!line.trim()) continue;
    if (line.trim() === "services:") continue;
    const itemMatch = line.match(/^\s*-\s+(\w+):\s*(.*)$/);
    if (itemMatch) {
      if (current) services.push(current);
      current = {};
      current[itemMatch[1]] = coerce(itemMatch[2]);
      continue;
    }
    const fieldMatch = line.match(/^\s+(\w+):\s*(.*)$/);
    if (fieldMatch && current) {
      current[fieldMatch[1]] = coerce(fieldMatch[2]);
    }
  }
  if (current) services.push(current);
  return services;
}

function coerce(value) {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export async function pingService(service, fetchImpl = fetch) {
  const started = Date.now();
  try {
    const response = await fetchImpl(service.url, { method: "GET" });
    const elapsedMs = Date.now() - started;
    const up = response.status === service.expect_status;
    return { name: service.name, url: service.url, status: response.status, up, elapsedMs };
  } catch (error) {
    return {
      name: service.name,
      url: service.url,
      status: 0,
      up: false,
      elapsedMs: Date.now() - started,
      error: error.message,
    };
  }
}

export function renderMarkdown(results, { now = new Date() } = {}) {
  const lines = [];
  lines.push("## Uptime board");
  lines.push("");
  lines.push(`_Last checked: ${now.toISOString()}_`);
  lines.push("");
  lines.push("| Service | Status | HTTP | Latency |");
  lines.push("| --- | --- | --- | --- |");
  for (const r of results) {
    const emoji = r.up ? "🟢" : "🔴";
    const label = r.up ? "up" : "down";
    lines.push(`| [${r.name}](${r.url}) | ${emoji} ${label} | ${r.status || "—"} | ${r.elapsedMs}ms |`);
  }
  lines.push("");
  return lines.join("\n");
}

export async function buildUptimeBoard({
  servicesPath = defaultServicesPath,
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  const text = readFileSync(servicesPath, "utf8");
  const services = parseServicesYaml(text);
  const results = [];
  for (const service of services) {
    results.push(await pingService(service, fetchImpl));
  }
  return { results, markdown: renderMarkdown(results, { now }) };
}

const isDirectInvocation = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectInvocation) {
  const { markdown } = await buildUptimeBoard();
  process.stdout.write(markdown + "\n");
}
