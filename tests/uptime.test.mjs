import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseServicesYaml,
  pingService,
  renderMarkdown,
  buildUptimeBoard,
} from "../scripts/uptime.mjs";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const servicesPath = resolve(__dirname, "..", "data", "services.yaml");

test("parseServicesYaml: extracts three services with name/url/expect_status", () => {
  const text = readFileSync(servicesPath, "utf8");
  const services = parseServicesYaml(text);
  assert.equal(services.length, 3);
  for (const s of services) {
    assert.ok(s.name, "name present");
    assert.ok(s.url.startsWith("http"), "url is http");
    assert.equal(typeof s.expect_status, "number");
  }
});

test("pingService: 200 with expect_status=200 yields up=true", async () => {
  const mockFetch = async () => ({ status: 200 });
  const result = await pingService(
    { name: "x", url: "https://x", expect_status: 200 },
    mockFetch,
  );
  assert.equal(result.up, true);
  assert.equal(result.status, 200);
});

test("pingService: 500 with expect_status=200 yields up=false", async () => {
  const mockFetch = async () => ({ status: 500 });
  const result = await pingService(
    { name: "x", url: "https://x", expect_status: 200 },
    mockFetch,
  );
  assert.equal(result.up, false);
  assert.equal(result.status, 500);
});

test("pingService: thrown error yields up=false and captures message", async () => {
  const mockFetch = async () => {
    throw new Error("ENOTFOUND");
  };
  const result = await pingService(
    { name: "x", url: "https://x", expect_status: 200 },
    mockFetch,
  );
  assert.equal(result.up, false);
  assert.equal(result.status, 0);
  assert.match(result.error, /ENOTFOUND/);
});

test("renderMarkdown: includes 🟢 for up and 🔴 for down rows", () => {
  const md = renderMarkdown([
    { name: "alpha", url: "https://a", status: 200, up: true, elapsedMs: 42 },
    { name: "beta", url: "https://b", status: 502, up: false, elapsedMs: 88 },
  ]);
  assert.match(md, /🟢 up/);
  assert.match(md, /🔴 down/);
  assert.match(md, /\[alpha\]\(https:\/\/a\)/);
  assert.match(md, /\[beta\]\(https:\/\/b\)/);
});

test("buildUptimeBoard: renders 3 service rows with mocked pings (one down)", async () => {
  const mockFetch = async (url) => {
    if (url.includes("gtm-ops")) return { status: 503 };
    return { status: 200 };
  };
  const fixedNow = new Date("2026-05-14T12:00:00.000Z");
  const { results, markdown } = await buildUptimeBoard({
    servicesPath,
    fetchImpl: mockFetch,
    now: fixedNow,
  });
  assert.equal(results.length, 3);
  const tableRows = markdown.split("\n").filter((l) => l.startsWith("| [") );
  assert.equal(tableRows.length, 3, "exactly 3 service rows");
  assert.match(markdown, /🟢 up/);
  assert.match(markdown, /🔴 down/);
  assert.match(markdown, /2026-05-14T12:00:00\.000Z/);
});
