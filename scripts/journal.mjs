#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLACEHOLDER_START = "<!-- journal:start -->";
const PLACEHOLDER_END = "<!-- journal:end -->";
const LEGACY_PLACEHOLDER = "<!-- journal -->";
const DATE_RE = /^(\d{4}-\d{2}-\d{2})\.md$/;

export const listJournalDates = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => {
      const m = name.match(DATE_RE);
      return m ? m[1] : null;
    })
    .filter((d) => d !== null)
    .sort();
};

export const pickLatestJournalDate = (dir, { before } = {}) => {
  const dates = listJournalDates(dir);
  const filtered = before ? dates.filter((d) => d < before) : dates;
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
};

export const extractFirstH2 = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  let h2Index = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+\S/.test(lines[i])) {
      h2Index = i;
      break;
    }
  }
  if (h2Index === -1) return null;
  const heading = lines[h2Index].replace(/^##\s+/, "").trim();
  const bodyLines = [];
  for (let i = h2Index + 1; i < lines.length; i++) {
    if (/^##\s+\S/.test(lines[i])) break;
    bodyLines.push(lines[i]);
  }
  while (bodyLines.length > 0 && bodyLines[0].trim() === "") bodyLines.shift();
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === "") {
    bodyLines.pop();
  }
  return { heading, body: bodyLines.join("\n") };
};

export const loadJournalEntry = (dir, date) => {
  const path = join(dir, `${date}.md`);
  if (!existsSync(path)) return null;
  const src = readFileSync(path, "utf8");
  const entry = extractFirstH2(src);
  if (!entry) return null;
  return { date, ...entry };
};

export const renderJournalMarkdown = (entry) => {
  if (!entry) {
    return [
      PLACEHOLDER_START,
      "### Yesterday I shipped",
      "",
      "*No journal entry yet.*",
      PLACEHOLDER_END,
      "",
    ].join("\n");
  }
  const out = [PLACEHOLDER_START, "### Yesterday I shipped", ""];
  out.push(`**${entry.heading}** — ${entry.date}`);
  if (entry.body && entry.body.trim() !== "") {
    out.push("");
    out.push(entry.body);
  }
  out.push("");
  out.push(PLACEHOLDER_END);
  out.push("");
  return out.join("\n");
};

export const injectJournalSection = (readme, block) => {
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

const isMain = () => {
  try {
    return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? "");
  } catch {
    return false;
  }
};

if (isMain()) {
  const args = process.argv.slice(2);
  let journalDir = join(ROOT, "journal");
  let readmePath = null;
  let date = null;
  let before = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--journal-dir") journalDir = args[++i];
    else if (a === "--readme") readmePath = args[++i];
    else if (a === "--date") date = args[++i];
    else if (a === "--before") before = args[++i];
  }
  const target = date ?? pickLatestJournalDate(journalDir, before ? { before } : undefined);
  const entry = target ? loadJournalEntry(journalDir, target) : null;
  const block = renderJournalMarkdown(entry);
  if (readmePath) {
    const readme = readFileSync(readmePath, "utf8");
    writeFileSync(readmePath, injectJournalSection(readme, block));
  } else {
    process.stdout.write(block);
  }
}
