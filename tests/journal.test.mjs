import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const {
  listJournalDates,
  pickLatestJournalDate,
  extractFirstH2,
  loadJournalEntry,
  renderJournalMarkdown,
  injectJournalSection,
} = await import(join(ROOT, "scripts/journal.mjs"));

const FIXTURE_DIR = join(ROOT, "journal");
const FIXTURE_DATE = "2026-05-13";

test("journal: fixture 2026-05-13.md exists and exposes a first H2", () => {
  const dates = listJournalDates(FIXTURE_DIR);
  assert.ok(dates.includes(FIXTURE_DATE), `expected ${FIXTURE_DATE} in journal dir`);
  const entry = loadJournalEntry(FIXTURE_DIR, FIXTURE_DATE);
  assert.ok(entry, "fixture must parse to an entry");
  assert.equal(entry.date, FIXTURE_DATE);
  assert.ok(entry.heading.length > 0, "heading must be non-empty");
});

test("journal: extractFirstH2 returns ONLY the first H2 — second H2 is excluded", () => {
  const src = [
    "# Top-level title",
    "",
    "## First section",
    "",
    "body of first",
    "",
    "## Second section",
    "",
    "body of second",
    "",
  ].join("\n");
  const got = extractFirstH2(src);
  assert.equal(got.heading, "First section");
  assert.ok(got.body.includes("body of first"));
  assert.ok(!got.body.includes("Second section"));
  assert.ok(!got.body.includes("body of second"));
});

test("journal: extractFirstH2 ignores H1 / H3 and only matches H2", () => {
  const src = "# Heading 1\n\n### Heading 3\n\nnot this either\n";
  assert.equal(extractFirstH2(src), null);
});

test("journal: renderJournalMarkdown wraps in placeholders + 'Yesterday I shipped' + heading on first body line", () => {
  const entry = { date: "2026-05-13", heading: "Shipped X", body: "did the thing" };
  const block = renderJournalMarkdown(entry);
  assert.ok(block.startsWith("<!-- journal:start -->"));
  assert.ok(block.includes("### Yesterday I shipped"));
  assert.ok(block.includes("**Shipped X** — 2026-05-13"));
  assert.ok(block.includes("did the thing"));
  assert.ok(block.includes("<!-- journal:end -->"));
});

test("journal: injectJournalSection replaces the legacy single-tag placeholder", () => {
  const readme = "intro\n\n<!-- journal -->\n\n### Next section\n";
  const block = renderJournalMarkdown({ date: "2026-05-13", heading: "T", body: "B" });
  const out = injectJournalSection(readme, block);
  assert.ok(out.includes("<!-- journal:start -->"));
  assert.ok(out.includes("<!-- journal:end -->"));
  assert.ok(out.includes("### Yesterday I shipped"));
  assert.ok(out.includes("### Next section"));
  assert.ok(!out.match(/<!-- journal -->/));
});

test("journal: injectJournalSection is idempotent across paired markers", () => {
  const block = renderJournalMarkdown({ date: "2026-05-13", heading: "T", body: "B" });
  const once = injectJournalSection("intro\n\n<!-- journal -->\n\ntail\n", block);
  const twice = injectJournalSection(once, block);
  assert.equal(once, twice, "second inject must produce byte-identical output");
});

test("journal: pickLatestJournalDate selects the lexicographically largest YYYY-MM-DD", () => {
  const tmp = mkdtempSync(join(tmpdir(), "journal-"));
  try {
    writeFileSync(join(tmp, "2025-01-01.md"), "## old\n");
    writeFileSync(join(tmp, "2026-05-13.md"), "## newer\n");
    writeFileSync(join(tmp, "2026-05-10.md"), "## middle\n");
    writeFileSync(join(tmp, "notes.md"), "## ignored\n");
    assert.equal(pickLatestJournalDate(tmp), "2026-05-13");
    assert.equal(pickLatestJournalDate(tmp, { before: "2026-05-13" }), "2026-05-10");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("journal: empty entry renders an explicit placeholder block", () => {
  const block = renderJournalMarkdown(null);
  assert.ok(block.includes("### Yesterday I shipped"));
  assert.ok(block.includes("*No journal entry yet.*"));
  assert.ok(block.startsWith("<!-- journal:start -->"));
});
