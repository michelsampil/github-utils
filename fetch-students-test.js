#!/usr/bin/env node

// =============================================================================
// sync_branches.sh
// Fetches all remote branches and creates local tracking branches for any
// that don't exist locally yet.
//
// Run from inside the repo:
//   node sync_branches.js
// =============================================================================

import { execSync } from "child_process";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function runSafe(cmd) {
  try {
    return { ok: true, output: run(cmd) };
  } catch (e) {
    return { ok: false, output: e.stderr || e.message };
  }
}

// --------------------------------------------------------------------------- //

console.log("🔄 Fetching all remote branches...\n");
run("git fetch --all --prune");

// Get all remote branches (strips "origin/" prefix)
const remoteBranches = run("git branch -r")
  .split("\n")
  .map((b) => b.trim())
  .filter((b) => b && !b.includes("->")) // skip HEAD -> main pointer
  .map((b) => b.replace(/^origin\//, ""));

// Get all local branches
const localBranches = new Set(
  run("git branch")
    .split("\n")
    .map((b) => b.replace(/^\*?\s+/, "").trim())
    .filter(Boolean)
);

console.log(`Found ${remoteBranches.length} remote branches.\n`);

let stats = { upToDate: 0, created: 0, failed: 0 };

for (const branch of remoteBranches) {
  if (localBranches.has(branch)) {
    console.log(`✓  Already local: ${branch}`);
    stats.upToDate++;
  } else {
    const result = runSafe(
      `git checkout --track -b "${branch}" "origin/${branch}"`
    );
    if (result.ok) {
      console.log(`+  Created & pulled: ${branch}`);
      stats.created++;
    } else {
      console.error(`✗  Failed: ${branch} — ${result.output.split("\n")[0]}`);
      stats.failed++;
    }
  }
}

console.log(`
============================================
 Done!
  Already local : ${stats.upToDate}
  Created+pulled: ${stats.created}
  Failed        : ${stats.failed}
============================================
`);
