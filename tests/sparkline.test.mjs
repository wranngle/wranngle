import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSparkline } from "../scripts/sparkline.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(readFileSync(join(ROOT, "fixtures/commits-mock.json"), "utf8"));

const renderFromFixture = () =>
  buildSparkline({
    repos: fixture.repos,
    days: fixture.days,
    endDate: fixture.end_date,
    mockCommits: fixture.commits,
  });

const countRects = (svg) => (svg.match(/<rect /g) ?? []).length;

const parseRects = (svg) =>
  [...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"><title>([^<]+)<\/title><\/rect>/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
    width: Number(m[3]),
    height: Number(m[4]),
    label: m[5],
  }));

test("buildSparkline: one bar per day in window", async () => {
  const svg = await renderFromFixture();
  assert.equal(countRects(svg), fixture.days);
  assert.ok(countRects(svg) >= 7, "expected at least 7 bars");
});

test("buildSparkline: tallest bar matches the max-commit day in fixture", async () => {
  const svg = await renderFromFixture();
  const rects = parseRects(svg);
  const tallest = rects.reduce((a, b) => (b.height > a.height ? b : a));
  assert.ok(tallest.label.startsWith("2026-05-10:"), `tallest label was ${tallest.label}`);
  assert.ok(tallest.label.includes("5 commits"), `tallest label was ${tallest.label}`);
});

test("buildSparkline: deterministic — same input produces byte-identical SVG", async () => {
  const a = await renderFromFixture();
  const b = await renderFromFixture();
  assert.equal(a, b);
});

test("buildSparkline: SVG fits the documented 200x32 envelope", async () => {
  const svg = await renderFromFixture();
  assert.match(svg, /width="200"/);
  assert.match(svg, /height="32"/);
  const rects = parseRects(svg);
  for (const r of rects) {
    assert.ok(r.x >= 0 && r.x + r.width <= 200, `bar ${r.label} overflows width`);
    assert.ok(r.y >= 0 && r.y + r.height <= 32, `bar ${r.label} overflows height`);
    assert.ok(r.height >= 1, `bar ${r.label} has zero height`);
  }
});

test("buildSparkline: zero-commit day renders a minimum-height bar (visible baseline)", async () => {
  const svg = await buildSparkline({
    repos: ["x"],
    days: 7,
    endDate: "2026-05-14",
    mockCommits: [],
  });
  const rects = parseRects(svg);
  assert.equal(rects.length, 7);
  for (const r of rects) assert.equal(r.height, 1);
});

test("buildSparkline: includes accessible aria-label", async () => {
  const svg = await renderFromFixture();
  assert.match(svg, /aria-label="Daily commit activity across public wranngle repos"/);
  assert.match(svg, /role="img"/);
});
