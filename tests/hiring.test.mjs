import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { parseHiringYaml, renderHiringMarkdown, injectHiringSection, loadHiringFromFile } =
  await import(join(ROOT, "scripts/hiring.mjs"));

test("hiring: fixture YAML parses to 2 roles with expected fields", () => {
  const data = loadHiringFromFile(join(ROOT, "data/hiring.yaml"));
  assert.equal(data.roles.length, 2);
  assert.equal(data.roles[0].title, "Production voice-agent observability");
  assert.match(data.roles[0].summary, /ElevenLabs/);
  assert.equal(data.roles[0].contact, "cody@wranngle.com");
  assert.equal(data.roles[1].title, "n8n + webhook security review");
});

test("hiring: rendered markdown contains 2 role headings + 1-line description per role", () => {
  const data = loadHiringFromFile(join(ROOT, "data/hiring.yaml"));
  const md = renderHiringMarkdown(data);
  const headingLines = md.split("\n").filter((l) => l.startsWith("#### "));
  assert.equal(headingLines.length, 2, `expected 2 role headings, got ${headingLines.length}`);
  for (const role of data.roles) {
    assert.ok(md.includes(`#### ${role.title}`), `missing heading for ${role.title}`);
    assert.ok(md.includes(role.summary), `missing summary for ${role.title}`);
  }
});

test("hiring: render wraps output in placeholder markers", () => {
  const md = renderHiringMarkdown({ roles: [{ title: "T", summary: "S", contact: "c@x" }] });
  assert.ok(md.startsWith("<!-- hiring:start -->"));
  assert.ok(md.includes("<!-- hiring:end -->"));
});

test("hiring: empty roles renders an honest placeholder, not a broken section", () => {
  const md = renderHiringMarkdown({ roles: [] });
  assert.ok(md.includes("<!-- hiring:start -->"));
  assert.ok(md.includes("<!-- hiring:end -->"));
  assert.ok(md.includes("No open roles"));
});

test("hiring: render is deterministic for the same input", () => {
  const data = loadHiringFromFile(join(ROOT, "data/hiring.yaml"));
  assert.equal(renderHiringMarkdown(data), renderHiringMarkdown(data));
});

test("hiring: inject replaces existing placeholder block byte-identically on repeat", () => {
  const data = loadHiringFromFile(join(ROOT, "data/hiring.yaml"));
  const block = renderHiringMarkdown(data);
  const readme = "# header\n\n<!-- hiring:start -->\nstale content\n<!-- hiring:end -->\n\nfooter\n";
  const once = injectHiringSection(readme, block);
  const twice = injectHiringSection(once, block);
  assert.equal(once, twice, "injection must be idempotent");
  assert.ok(once.includes("#### Production voice-agent observability"));
  assert.ok(once.includes("footer"));
});

test("hiring: inject appends when no placeholder present", () => {
  const block = renderHiringMarkdown({ roles: [{ title: "T", summary: "S" }] });
  const readme = "# only header\n";
  const result = injectHiringSection(readme, block);
  assert.ok(result.includes("<!-- hiring:start -->"));
  assert.ok(result.includes("#### T"));
});

test("hiring: contact line omitted when YAML role has no contact field", () => {
  const md = renderHiringMarkdown({ roles: [{ title: "X", summary: "Y" }] });
  assert.ok(!md.includes("Reach me at"));
});
