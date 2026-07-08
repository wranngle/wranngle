#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const template = readFileSync(join(root, "templates/README.template.md"), "utf8");
const data = JSON.parse(readFileSync(join(root, "data/profile.json"), "utf8"));

const render = (tpl, ctx) => {
  let out = tpl.replace(/\{\{#each (\w+)\}\}\n([\s\S]*?)\{\{\/each\}\}\n/g, (_, key, block) => {
    const arr = ctx[key];
    if (!Array.isArray(arr) || arr.length === 0) return "";
    return arr.map(item => renderBlock(block, item)).join("");
  });
  out = out.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] ?? "");
  return out;
};

const renderBlock = (block, item) => {
  let out = block.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) => {
    const v = typeof item === "object" ? item[key] : null;
    return v == null || v === "" ? "" : inner.replace(/\{\{(\w+)\}\}/g, (_m, k) => (typeof item === "object" ? item[k] ?? "" : ""));
  });
  out = out.replace(/\{\{\.\}\}/g, () => String(item));
  out = out.replace(/\{\{(\w+)\}\}/g, (_, key) => (typeof item === "object" ? item[key] ?? "" : ""));
  return out;
};

// Nightstand injection retired 2026-07-08: reading-list signal is for friends,
// not the recruiters this README serves. scripts/nightstand.mjs and
// data/nightstand.yaml stay in the repo; re-add the injection call to bring
// the section back.
const rendered = render(template, data);

writeFileSync(join(root, "README.md"), rendered);
