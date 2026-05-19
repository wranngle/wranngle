#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const owner = "wranngle";
const repos = [
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
  "User-Agent": "wranngle-profile-now-shipping",
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const trimSubject = (msg) => (msg ?? "").split(/\r?\n/, 1)[0].trim();

const fetchLatest = async (repo) => {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${repo}: HTTP ${res.status} ${res.statusText}`);
  const arr = await res.json();
  if (!Array.isArray(arr) || arr.length === 0) throw new Error(`${repo}: no commits returned`);
  const c = arr[0];
  const sha = c.sha;
  return {
    repo,
    last_commit_sha: sha,
    short_sha: sha.slice(0, 7),
    last_commit_message: trimSubject(c.commit?.message),
    committed_at: c.commit?.committer?.date ?? c.commit?.author?.date ?? null,
  };
};

const results = [];
const errors = [];
for (const repo of repos) {
  try {
    results.push(await fetchLatest(repo));
  } catch (err) {
    errors.push({ repo, error: err.message });
  }
}

results.sort((a, b) => (b.committed_at ?? "").localeCompare(a.committed_at ?? ""));

const payload = {
  generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  source: `https://api.github.com/repos/${owner}/<repo>/commits`,
  repos: results,
  ...(errors.length ? { errors } : {}),
};

writeFileSync(join(root, "data/now-shipping.json"), JSON.stringify(payload, null, 2) + "\n");

if (errors.length) {
  console.error(`fetch-shipping: ${errors.length} repo(s) failed:`, errors);
  process.exitCode = 1;
} else {
  console.log(`fetch-shipping: wrote ${results.length} entries to data/now-shipping.json`);
}
