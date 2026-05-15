#!/usr/bin/env bats

# tests for the deterministic readme regenerator.
# behavior under test: regen produces byte-identical output across runs,
# and the rendered readme reflects the source-of-truth data file.

setup() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  cd "$REPO_ROOT"
}

# central promise: regen is idempotent — running twice yields no diff.
@test "regen: running twice produces no git diff on README.md" {
  node scripts/regen-readme.mjs
  run git diff --exit-code README.md
  [ "$status" -eq 0 ]
  node scripts/regen-readme.mjs
  run git diff --exit-code README.md
  [ "$status" -eq 0 ]
}

# doctrine drift: README must reflect the canonical name in data/profile.json.
@test "regen: README contains the name from data/profile.json" {
  node scripts/regen-readme.mjs
  name=$(node -e "console.log(JSON.parse(require('fs').readFileSync('data/profile.json','utf8')).name)")
  run grep -F "# $name" README.md
  [ "$status" -eq 0 ]
}

# doctrine drift: README must reflect the canonical status string verbatim.
@test "regen: README contains the status from data/profile.json" {
  node scripts/regen-readme.mjs
  status_line=$(node -e "console.log(JSON.parse(require('fs').readFileSync('data/profile.json','utf8')).status)")
  run grep -F "$status_line" README.md
  [ "$status" -eq 0 ]
}
