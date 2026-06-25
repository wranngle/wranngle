#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLACEHOLDER_START = "<!-- nightstand:start -->";
const PLACEHOLDER_END = "<!-- nightstand:end -->";
const LEGACY_PLACEHOLDER = "<!-- nightstand -->";

const unquote = (s) => {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
};

export const parseNightstandYaml = (src) => {
  const lines = src.split(/\r?\n/);
  const books = [];
  let current = null;
  let inBooks = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line === "" || line.startsWith("#")) continue;
    if (line === "books:") { inBooks = true; continue; }
    if (!inBooks) continue;
    const itemMatch = line.match(/^\s{2}-\s+(\w+):\s*(.*)$/);
    if (itemMatch) {
      if (current) books.push(current);
      current = {};
      const [, key, val] = itemMatch;
      current[key] = coerce(key, unquote(val));
      continue;
    }
    const fieldMatch = line.match(/^\s{4}(\w+):\s*(.*)$/);
    if (fieldMatch && current) {
      const [, key, val] = fieldMatch;
      current[key] = coerce(key, unquote(val));
    }
  }
  if (current) books.push(current);
  return { books };
};

const coerce = (key, val) => {
  if (key === "percent") {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }
  return val;
};

export const formatPercent = (pct) => {
  const n = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  return `${n}%`;
};

export const renderNightstandMarkdown = ({ books }) => {
  if (!Array.isArray(books) || books.length === 0) {
    return [PLACEHOLDER_START, "### Nightstand", "", "*Empty stack right now.*", PLACEHOLDER_END, ""].join("\n");
  }
  const out = [PLACEHOLDER_START, "### Nightstand", ""];
  for (const book of books) {
    const titleLink = book.link ? `[${book.title}](${book.link})` : book.title;
    const cover = `<img src="${book.cover}" alt="Cover of ${book.title}" width="64" align="left" />`;
    out.push(`- ${cover} **${titleLink}** by ${book.author} · ${formatPercent(book.percent)} read`);
  }
  out.push("");
  out.push(PLACEHOLDER_END);
  out.push("");
  return out.join("\n");
};

export const injectNightstandSection = (readme, block) => {
  const startIdx = readme.indexOf(PLACEHOLDER_START);
  const endIdx = readme.indexOf(PLACEHOLDER_END);
  if (startIdx !== -1 && endIdx !== -1) {
    const before = readme.slice(0, startIdx);
    const after = readme.slice(endIdx + PLACEHOLDER_END.length);
    return before + block.trimEnd() + after;
  }
  const legacyIdx = readme.indexOf(LEGACY_PLACEHOLDER);
  if (legacyIdx !== -1) {
    const before = readme.slice(0, legacyIdx);
    const after = readme.slice(legacyIdx + LEGACY_PLACEHOLDER.length);
    return before + block.trimEnd() + after;
  }
  return readme.trimEnd() + "\n\n" + block;
};

export const loadNightstandFromFile = (path) => {
  const src = readFileSync(path, "utf8");
  return parseNightstandYaml(src);
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
  let dataPath = join(ROOT, "data/nightstand.yaml");
  let readmePath = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--data") dataPath = args[++i];
    else if (a === "--readme") readmePath = args[++i];
  }
  const data = loadNightstandFromFile(dataPath);
  const block = renderNightstandMarkdown(data);
  if (readmePath) {
    const readme = readFileSync(readmePath, "utf8");
    writeFileSync(readmePath, injectNightstandSection(readme, block));
  } else {
    process.stdout.write(block);
  }
}
