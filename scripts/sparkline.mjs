#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "wranngle";

const DEFAULT_REPOS = [
  "voice_ai_agent_evals",
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

const DEFAULT_DAYS = 14;
const WIDTH = 200;
const HEIGHT = 32;
const PAD = 1;

const toYMD = (d) => d.toISOString().slice(0, 10);

const dayWindow = (days, endDate) => {
  const end = endDate ? new Date(`${endDate}T00:00:00Z`) : new Date();
  end.setUTCHours(0, 0, 0, 0);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.push(toYMD(d));
  }
  return out;
};

const tallyByDay = (commits, dayKeys) => {
  const counts = Object.fromEntries(dayKeys.map((k) => [k, 0]));
  for (const c of commits) {
    if (counts[c.date] != null) counts[c.date] += 1;
  }
  return dayKeys.map((k) => counts[k]);
};

const renderSvg = (values, dayKeys) => {
  const n = values.length;
  const max = Math.max(1, ...values);
  const slot = WIDTH / n;
  const barWidth = Math.max(1, Math.floor(slot - PAD));
  const rects = values
    .map((v, i) => {
      const h = Math.max(1, Math.round((v / max) * (HEIGHT - 2)));
      const x = Math.round(i * slot);
      const y = HEIGHT - h;
      const label = `${dayKeys[i]}: ${v} commit${v === 1 ? "" : "s"}`;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}"><title>${label}</title></rect>`;
    })
    .join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="Daily commit activity across public wranngle repos">`,
    `<g fill="#6e40c9">${rects}</g>`,
    `</svg>`,
  ].join("");
};

const fetchRepoCommits = async (repo, sinceISO, headers) => {
  const out = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com/repos/${OWNER}/${repo}/commits?since=${encodeURIComponent(sinceISO)}&per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${repo}: HTTP ${res.status} ${res.statusText}`);
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const c of arr) {
      const date = (c.commit?.committer?.date ?? c.commit?.author?.date ?? "").slice(0, 10);
      if (date) out.push({ repo, date, sha: c.sha });
    }
    if (arr.length < 100) break;
    page += 1;
    if (page > 5) break;
  }
  return out;
};

export const buildSparkline = async ({ repos = DEFAULT_REPOS, days = DEFAULT_DAYS, token, mockCommits, endDate } = {}) => {
  const dayKeys = dayWindow(days, endDate);
  let commits;
  if (mockCommits) {
    commits = mockCommits;
  } else {
    const headers = {
      "User-Agent": "wranngle-profile-sparkline",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const sinceISO = `${dayKeys[0]}T00:00:00Z`;
    commits = [];
    for (const repo of repos) {
      try {
        const c = await fetchRepoCommits(repo, sinceISO, headers);
        commits.push(...c);
      } catch (err) {
        console.error(`sparkline: ${err.message}`);
      }
    }
  }
  const values = tallyByDay(commits, dayKeys);
  return renderSvg(values, dayKeys);
};

const parseArgs = (argv) => {
  const args = { mock: null, out: null, days: DEFAULT_DAYS, endDate: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mock") args.mock = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--days") args.days = Number(argv[++i]);
    else if (a === "--end-date") args.endDate = argv[++i];
  }
  return args;
};

const isMain = () => {
  try {
    return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? "");
  } catch {
    return false;
  }
};

if (isMain()) {
  const args = parseArgs(process.argv.slice(2));
  let opts = { days: args.days, endDate: args.endDate, token: process.env.GITHUB_TOKEN || process.env.PROJECTS_TOKEN };
  if (args.mock) {
    const fixture = JSON.parse(readFileSync(args.mock, "utf8"));
    opts = {
      repos: fixture.repos ?? DEFAULT_REPOS,
      days: fixture.days ?? args.days,
      endDate: fixture.end_date ?? args.endDate,
      mockCommits: fixture.commits ?? [],
    };
  }
  const svg = await buildSparkline(opts);
  if (args.out) writeFileSync(args.out, svg + "\n");
  else process.stdout.write(svg + "\n");
}
