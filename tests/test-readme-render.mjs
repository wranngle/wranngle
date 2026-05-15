#!/usr/bin/env node
// smoke test: the "Now hiring help on" section in templates/README.template.md
// renders conditionally — present only when data/profile.json's now_hiring
// array is non-empty. Tests the template's conditional rendering against the
// same rendering logic the production regenerator uses, without mutating the
// committed README.md or data/profile.json on disk.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const template = readFileSync(join(root, "templates/README.template.md"), "utf8");

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

const baseCtx = {
  name: "wranngle",
  intro: "x",
  status: "S",
  selected_work: [],
  operating_record: [],
  links: "L",
  reading: [],
  now_shipping: [],
};

const SECTION_HEADER = "### Now hiring help on";

const emptyOut = render(template, { ...baseCtx, now_hiring: [] });
assert.equal(
  emptyOut.includes(SECTION_HEADER),
  false,
  "empty now_hiring must NOT render the section header",
);

const populatedOut = render(template, {
  ...baseCtx,
  now_hiring: [
    { header: SECTION_HEADER, item: "collaborator A" },
    { item: "collaborator B" },
  ],
});
assert.equal(
  populatedOut.includes(SECTION_HEADER),
  true,
  "populated now_hiring MUST render the section header",
);
assert.equal(
  populatedOut.includes("- collaborator A"),
  true,
  "populated now_hiring MUST render the first item bullet",
);
assert.equal(
  populatedOut.includes("- collaborator B"),
  true,
  "populated now_hiring MUST render every subsequent item bullet",
);
assert.equal(
  (populatedOut.match(new RegExp(SECTION_HEADER, "g")) || []).length,
  1,
  "section header must render exactly once even when multiple items present",
);

const liveData = JSON.parse(readFileSync(join(root, "data/profile.json"), "utf8"));
const liveOut = render(template, liveData);
const expectSection = Array.isArray(liveData.now_hiring) && liveData.now_hiring.length > 0;
assert.equal(
  liveOut.includes(SECTION_HEADER),
  expectSection,
  expectSection
    ? "live data has now_hiring entries; rendered README must contain the section header"
    : "live data has empty now_hiring; rendered README must omit the section header",
);

console.log("test-readme-render: OK");
