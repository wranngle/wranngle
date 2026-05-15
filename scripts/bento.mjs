#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const OWNER = "wranngle";
const REPOS = [
  "voice-evals",
  "n8n_knowledge_base",
  "n8n",
  "gtm_ops",
  "auto_demo",
  "wranngle_com",
  "tradingbot",
  "career_architect",
  "comfyui_bulk_python_generator",
  "logo_maker",
  "pinchgrab",
  "wranngle",
  "droidlan",
];

const token = process.env.GITHUB_TOKEN || process.env.PROJECTS_TOKEN || "";
const headers = {
  "User-Agent": "wranngle-profile-bento",
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const fetchRepo = async (repo) => {
  const url = `https://api.github.com/repos/${OWNER}/${repo}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${repo}: HTTP ${res.status} ${res.statusText}`);
  const j = await res.json();
  return {
    repo,
    open_prs: j.open_issues_count ?? 0,
    pushed_at: j.pushed_at ?? null,
    archived: !!j.archived,
  };
};

const fetchOpenPrCount = async (repo) => {
  const url = `https://api.github.com/search/issues?q=repo:${OWNER}/${repo}+is:pr+is:open`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${repo}: HTTP ${res.status} ${res.statusText}`);
  const j = await res.json();
  return j.total_count ?? 0;
};

export const collectRows = async (repos = REPOS) => {
  const rows = [];
  const errors = [];
  for (const repo of repos) {
    try {
      const meta = await fetchRepo(repo);
      const open_prs = await fetchOpenPrCount(repo);
      rows.push({ repo, open_prs, pushed_at: meta.pushed_at, archived: meta.archived });
    } catch (err) {
      errors.push({ repo, error: err.message });
    }
  }
  return { rows, errors };
};

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;

export const formatRelative = (iso, now = Date.now()) => {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "—";
  const diff = Math.max(0, now - ts);
  if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MINUTE))}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  const days = Math.floor(diff / DAY);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

export const badgeColor = (openPrs) => {
  if (openPrs === 0) return "lightgrey";
  if (openPrs <= 2) return "brightgreen";
  if (openPrs <= 5) return "yellow";
  return "orange";
};

export const sortRows = (rows) =>
  [...rows].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return (b.pushed_at ?? "").localeCompare(a.pushed_at ?? "");
  });

export const renderRows = (rows, now = Date.now()) =>
  sortRows(rows).map((r) => ({
    repo: r.repo,
    open_prs: r.open_prs,
    badge_color: badgeColor(r.open_prs),
    last_pushed_relative: formatRelative(r.pushed_at, now),
  }));

const renderBlock = (block, item) => {
  let out = block.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) => {
    const v = item?.[key];
    return v == null || v === "" ? "" : inner.replace(/\{\{(\w+)\}\}/g, (_m, k) => item?.[k] ?? "");
  });
  out = out.replace(/\{\{\.\}\}/g, () => String(item));
  out = out.replace(/\{\{(\w+)\}\}/g, (_, key) => (typeof item === "object" ? item[key] ?? "" : ""));
  return out;
};

export const render = (tpl, ctx) => {
  let out = tpl.replace(/\{\{#each (\w+)\}\}\n([\s\S]*?)\{\{\/each\}\}\n/g, (_, key, block) => {
    const arr = ctx[key];
    if (!Array.isArray(arr) || arr.length === 0) return "";
    return arr.map((item) => renderBlock(block, item)).join("");
  });
  out = out.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] ?? "");
  return out;
};

export const buildBento = ({ rows, generated_at, now }) => {
  const tpl = readFileSync(join(root, "templates/bento.md"), "utf8");
  return render(tpl, {
    rows: renderRows(rows, now ?? Date.parse(generated_at)),
    generated_at,
  });
};

const isMain = (() => {
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();

export const injectBento = (readme, block) => {
  const trimmed = block.trimEnd();
  const fenced = /<!-- bento:start -->[\s\S]*?<!-- bento:end -->/;
  if (fenced.test(readme)) return readme.replace(fenced, trimmed);
  return readme.replace(/<!-- bento -->/, trimmed);
};

if (isMain) {
  const args = process.argv.slice(2);
  const mockIdx = args.indexOf("--mock");
  const outIdx = args.indexOf("--out");
  const injectIdx = args.indexOf("--inject");
  const mockPath = mockIdx >= 0 ? args[mockIdx + 1] : null;
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
  const injectPath = injectIdx >= 0 ? args[injectIdx + 1] : null;

  let rows;
  let generated_at;
  let errors = [];

  if (mockPath) {
    const fixture = JSON.parse(readFileSync(mockPath, "utf8"));
    rows = fixture.rows;
    generated_at = fixture.generated_at ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  } else {
    const collected = await collectRows();
    rows = collected.rows;
    errors = collected.errors;
    generated_at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  const snapshot = {
    generated_at,
    source: `https://api.github.com/repos/${OWNER}/<repo>`,
    rows,
    ...(errors.length ? { errors } : {}),
  };
  writeFileSync(join(root, "data/bento.json"), JSON.stringify(snapshot, null, 2) + "\n");

  const block = buildBento({ rows, generated_at });
  if (injectPath) {
    const current = readFileSync(injectPath, "utf8");
    const next = injectBento(current, block);
    writeFileSync(injectPath, next);
  } else if (outPath) {
    writeFileSync(outPath, block);
  } else {
    process.stdout.write(block);
  }

  if (errors.length) {
    console.error(`bento: ${errors.length} repo(s) failed:`, errors);
    process.exitCode = 1;
  }
}
