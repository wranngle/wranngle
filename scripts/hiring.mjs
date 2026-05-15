#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLACEHOLDER_START = "<!-- hiring:start -->";
const PLACEHOLDER_END = "<!-- hiring:end -->";

export const parseHiringYaml = (src) => {
  const lines = src.split(/\r?\n/);
  const roles = [];
  let current = null;
  let inRoles = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line === "" || line.startsWith("#")) continue;
    if (line === "roles:") { inRoles = true; continue; }
    if (!inRoles) continue;
    const itemMatch = line.match(/^\s{2}-\s+(\w+):\s*(.*)$/);
    if (itemMatch) {
      if (current) roles.push(current);
      current = {};
      const [, key, val] = itemMatch;
      current[key] = unquote(val);
      continue;
    }
    const fieldMatch = line.match(/^\s{4}(\w+):\s*(.*)$/);
    if (fieldMatch && current) {
      const [, key, val] = fieldMatch;
      current[key] = unquote(val);
    }
  }
  if (current) roles.push(current);
  return { roles };
};

const unquote = (s) => {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
};

export const renderHiringMarkdown = ({ roles }) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    return [PLACEHOLDER_START, "### Hiring", "", "*No open roles right now.*", PLACEHOLDER_END, ""].join("\n");
  }
  const out = [PLACEHOLDER_START, "### Hiring", ""];
  for (const role of roles) {
    out.push(`#### ${role.title}`);
    out.push("");
    out.push(role.summary);
    if (role.contact) {
      out.push("");
      out.push(`Reach me at ${role.contact}.`);
    }
    out.push("");
  }
  out.push(PLACEHOLDER_END);
  out.push("");
  return out.join("\n");
};

export const injectHiringSection = (readme, block) => {
  const startIdx = readme.indexOf(PLACEHOLDER_START);
  const endIdx = readme.indexOf(PLACEHOLDER_END);
  if (startIdx !== -1 && endIdx !== -1) {
    const before = readme.slice(0, startIdx);
    const after = readme.slice(endIdx + PLACEHOLDER_END.length);
    return before + block.trimEnd() + after;
  }
  return readme.trimEnd() + "\n\n" + block;
};

export const loadHiringFromFile = (path) => {
  const src = readFileSync(path, "utf8");
  return parseHiringYaml(src);
};

const isMain = () => {
  try {
    return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? "");
  } catch {
    return false;
  }
};

if (isMain()) {
  const args = process.argv.slice(2);
  let dataPath = join(ROOT, "data/hiring.yaml");
  let readmePath = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--data") dataPath = args[++i];
    else if (a === "--readme") readmePath = args[++i];
  }
  const data = loadHiringFromFile(dataPath);
  const block = renderHiringMarkdown(data);
  if (readmePath) {
    const readme = readFileSync(readmePath, "utf8");
    writeFileSync(readmePath, injectHiringSection(readme, block));
  } else {
    process.stdout.write(block);
  }
}
