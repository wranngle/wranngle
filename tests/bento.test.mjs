import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBento,
  renderRows,
  badgeColor,
  formatRelative,
  sortRows,
  injectBento,
} from "../scripts/bento.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, "..", "fixtures", "bento-mock.json"), "utf8"),
);

// central promise: bento renders a markdown table row per repo with a PR-count badge.
test("bento: rendered markdown has one row per repo plus a PR-count badge", () => {
  const block = buildBento({
    rows: fixture.rows,
    generated_at: fixture.generated_at,
    now: Date.parse("2026-05-15T00:00:00Z"),
  });

  const rowLines = block
    .split("\n")
    .filter((l) => l.startsWith("| [") && l.includes("](https://github.com/wranngle/"));
  assert.equal(
    rowLines.length,
    fixture.rows.length,
    `expected ${fixture.rows.length} repo rows, got ${rowLines.length}`,
  );

  for (const row of fixture.rows) {
    const line = rowLines.find((l) => l.includes(`[${row.repo}]`));
    assert.ok(line, `missing row for ${row.repo}`);
    assert.match(
      line,
      /!\[PRs\]\(https:\/\/img\.shields\.io\/badge\/PRs-\d+-[a-z]+/,
      `row for ${row.repo} missing PR-count badge`,
    );
    assert.ok(
      line.includes(`PRs-${row.open_prs}-`),
      `row for ${row.repo} should encode open_prs=${row.open_prs}`,
    );
  }
});

// determinism: same input → byte-identical output.
test("bento: same input renders byte-identical markdown", () => {
  const a = buildBento({
    rows: fixture.rows,
    generated_at: fixture.generated_at,
    now: Date.parse("2026-05-15T00:00:00Z"),
  });
  const b = buildBento({
    rows: fixture.rows,
    generated_at: fixture.generated_at,
    now: Date.parse("2026-05-15T00:00:00Z"),
  });
  assert.equal(a, b);
});

// sort contract: most-recently-pushed first; archived repos last.
test("bento: rows are sorted by pushed_at desc, archived last", () => {
  const withArchived = [
    ...fixture.rows,
    { repo: "old-thing", open_prs: 0, pushed_at: "2026-05-14T23:00:00Z", archived: true },
  ];
  const sorted = sortRows(withArchived);
  assert.equal(sorted[sorted.length - 1].repo, "old-thing");
  const expectedTop = fixture.rows
    .slice()
    .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))[0].repo;
  assert.equal(sorted[0].repo, expectedTop);
});

// badge-color contract: PR count maps to known bucket colors.
test("bento: badge color buckets cover zero / low / medium / high", () => {
  assert.equal(badgeColor(0), "lightgrey");
  assert.equal(badgeColor(1), "brightgreen");
  assert.equal(badgeColor(2), "brightgreen");
  assert.equal(badgeColor(3), "yellow");
  assert.equal(badgeColor(5), "yellow");
  assert.equal(badgeColor(6), "orange");
  assert.equal(badgeColor(99), "orange");
});

// relative-time contract: stable bucketing of pushed_at deltas.
test("bento: relative-time formatter buckets minutes / hours / days / months", () => {
  const now = Date.parse("2026-05-14T12:00:00Z");
  assert.equal(formatRelative("2026-05-14T11:30:00Z", now), "30m ago");
  assert.equal(formatRelative("2026-05-14T08:00:00Z", now), "4h ago");
  assert.equal(formatRelative("2026-05-10T12:00:00Z", now), "4d ago");
  assert.equal(formatRelative("2026-03-14T12:00:00Z", now), "2mo ago");
  assert.equal(formatRelative(null, now), "—");
});

// injection contract: first run replaces the placeholder; second run is idempotent.
test("bento: inject replaces placeholder and is idempotent on second run", () => {
  const block = buildBento({
    rows: fixture.rows,
    generated_at: fixture.generated_at,
    now: Date.parse("2026-05-15T00:00:00Z"),
  });
  const readmeBefore = "# wranngle\n\nintro\n\n<!-- bento -->\n\n---\n";
  const onceInjected = injectBento(readmeBefore, block);
  assert.ok(!onceInjected.includes("<!-- bento -->\n\n---"), "placeholder should be replaced");
  assert.ok(onceInjected.includes("<!-- bento:start -->"));
  assert.ok(onceInjected.includes("<!-- bento:end -->"));

  const twiceInjected = injectBento(onceInjected, block);
  assert.equal(twiceInjected, onceInjected, "second injection should be idempotent");
});

// rendered-rows contract: shape matches the template's expected fields.
test("bento: renderRows produces fields the template binds to", () => {
  const rendered = renderRows(fixture.rows, Date.parse("2026-05-15T00:00:00Z"));
  for (const r of rendered) {
    assert.ok("repo" in r);
    assert.ok("open_prs" in r);
    assert.ok("badge_color" in r);
    assert.ok("last_pushed_relative" in r);
  }
});
