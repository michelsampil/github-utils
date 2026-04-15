// =============================================================================
// Configuration — edit these two constants before running
// =============================================================================

const REPO = "owner/repo-name"; // GitHub repo in "owner/repo" format or full URL

const BASE_BRANCH = "main"; // branch to fork from

const STUDENTS = ["Surname, Name"];

// =============================================================================
// Script — no need to edit below this line
// =============================================================================

const { execSync } = require("child_process");

function sanitize(name) {
  const parts = name.split(",");
  const normalized =
    parts.length === 2 ? `${parts[1].trim()} ${parts[0].trim()}` : name.trim();

  return normalized
    .toLowerCase()
    .normalize("NFD") // decompose accented chars into base + diacritic
    .replace(/[\u0300-\u036f]/g, "") // remove diacritic marks
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric runs with hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function branchExistsOnRemote(branch) {
  try {
    const result = run(`git ls-remote --heads origin "${branch}"`);
    return result.length > 0;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------- //

// Accept either "owner/repo" or a full GitHub URL
const REPO_URL = REPO.startsWith("http")
  ? REPO.replace(/\.git$/, "") + ".git"
  : `https://github.com/${REPO}.git`;

// Preview the branch names before doing anything
console.log("\n📋 Branch names to be created:\n");
for (const student of STUDENTS) {
  console.log(`   ${sanitize(student).padEnd(30)} ← ${student}`);
}
console.log("");

// Use a temp dir for a shallow clone
const os = require("os");
const fs = require("fs");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gh-branches-"));

let stats = { created: 0, skipped: 0, failed: 0 };

try {
  console.log(`🔗 Cloning ${REPO_URL} (shallow)...`);
  run(
    `git clone --quiet --depth 1 --branch "${BASE_BRANCH}" "${REPO_URL}" "${tmpDir}"`
  );
  process.chdir(tmpDir);
  console.log(`✅ Cloned into ${tmpDir}\n`);

  for (const student of STUDENTS) {
    const branch = sanitize(student);

    if (!branch) {
      console.warn(`⚠️  Skipping "${student}" — sanitized name is empty.`);
      stats.failed++;
      continue;
    }

    if (branchExistsOnRemote(branch)) {
      console.log(`⏭️  Already exists: ${branch}`);
      stats.skipped++;
      continue;
    }

    try {
      run(
        `git push --quiet origin "origin/${BASE_BRANCH}:refs/heads/${branch}"`
      );
      console.log(`✓  Created: ${branch}`);
      stats.created++;
    } catch (e) {
      console.error(`✗  Failed:  ${branch} — ${e.message.split("\n")[0]}`);
      stats.failed++;
    }
  }
} finally {
  // Clean up temp clone
  process.chdir(os.homedir());
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`
============================================
 Done!
  Created : ${stats.created}
  Skipped : ${stats.skipped}  (already existed)
  Failed  : ${stats.failed}
============================================
`);
