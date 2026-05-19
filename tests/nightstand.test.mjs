import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const {
  parseNightstandYaml,
  renderNightstandMarkdown,
  injectNightstandSection,
  loadNightstandFromFile,
  formatPercent,
} = await import(join(ROOT, "scripts/nightstand.mjs"));

test("nightstand: fixture YAML parses to 3 books with cover + percent", () => {
  const data = loadNightstandFromFile(join(ROOT, "data/nightstand.yaml"));
  assert.equal(data.books.length, 3);
  for (const book of data.books) {
    assert.ok(book.title, "title required");
    assert.ok(book.author, "author required");
    assert.ok(book.cover && /^https?:\/\//.test(book.cover), "cover must be a URL");
    assert.equal(typeof book.percent, "number", "percent must be numeric after parse");
  }
});

test("nightstand: each rendered book has a cover image link and percent-read formatted as `NN%`", () => {
  const data = loadNightstandFromFile(join(ROOT, "data/nightstand.yaml"));
  const md = renderNightstandMarkdown(data);
  for (const book of data.books) {
    assert.ok(md.includes(book.cover), `missing cover URL for ${book.title}`);
    assert.ok(
      md.includes(`alt="Cover of ${book.title}"`),
      `cover image not bound to ${book.title}`
    );
    assert.ok(md.includes(book.title), `missing title ${book.title}`);
    const pct = formatPercent(book.percent);
    assert.match(pct, /^\d{1,3}%$/, "percent must match NN% shape");
    assert.ok(md.includes(`${pct} read`), `missing "${pct} read" for ${book.title}`);
  }
});

test("nightstand: render wraps output in placeholder markers and a heading", () => {
  const md = renderNightstandMarkdown({
    books: [{ title: "T", author: "A", cover: "https://x/y.jpg", percent: 50 }],
  });
  assert.ok(md.startsWith("<!-- nightstand:start -->"));
  assert.ok(md.includes("<!-- nightstand:end -->"));
  assert.ok(md.includes("### Nightstand"));
});

test("nightstand: empty stack renders an honest placeholder, not a broken section", () => {
  const md = renderNightstandMarkdown({ books: [] });
  assert.ok(md.includes("<!-- nightstand:start -->"));
  assert.ok(md.includes("<!-- nightstand:end -->"));
  assert.ok(md.includes("Empty stack"));
});

test("nightstand: render is deterministic for the same input", () => {
  const data = loadNightstandFromFile(join(ROOT, "data/nightstand.yaml"));
  assert.equal(renderNightstandMarkdown(data), renderNightstandMarkdown(data));
});

test("nightstand: inject replaces existing placeholder block idempotently", () => {
  const data = loadNightstandFromFile(join(ROOT, "data/nightstand.yaml"));
  const block = renderNightstandMarkdown(data);
  const readme = "# header\n\n<!-- nightstand:start -->\nstale\n<!-- nightstand:end -->\n\nfooter\n";
  const once = injectNightstandSection(readme, block);
  const twice = injectNightstandSection(once, block);
  assert.equal(once, twice, "inject must be idempotent");
  assert.ok(once.includes("### Nightstand"));
  assert.ok(once.includes("footer"));
});

test("nightstand: inject resolves the bare `<!-- nightstand -->` placeholder on first render", () => {
  const block = renderNightstandMarkdown({
    books: [{ title: "T", author: "A", cover: "https://x/y.jpg", percent: 25 }],
  });
  const readme = "# header\n\n<!-- nightstand -->\n\nfooter\n";
  const result = injectNightstandSection(readme, block);
  assert.ok(result.includes("<!-- nightstand:start -->"));
  assert.ok(result.includes("25% read"));
  assert.ok(!result.includes("<!-- nightstand -->\n\nfooter"), "legacy bare token must be consumed");
});

test("nightstand: percent rounds and clamps to 0–100", () => {
  assert.equal(formatPercent(42), "42%");
  assert.equal(formatPercent(42.6), "43%");
  assert.equal(formatPercent(-5), "0%");
  assert.equal(formatPercent(150), "100%");
  assert.equal(formatPercent("18"), "18%");
});

test("nightstand: link omitted gracefully when book has no link field", () => {
  const md = renderNightstandMarkdown({
    books: [{ title: "Bare", author: "X", cover: "https://x/y.jpg", percent: 10 }],
  });
  assert.ok(md.includes("**Bare**"), "title still rendered without link");
  assert.ok(!md.includes("[Bare]("), "no markdown link emitted when absent");
});
