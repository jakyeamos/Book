import * as fs from "node:fs";
import * as path from "node:path";

const rootDir = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`${label} missing: ${needle}`);
  }
}

function run(): void {
  const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const checklist = read("docs/phase06-acceptance-checklist.md");
  const operations = read("docs/operations.md");

  if (!pkg.scripts?.["platform:deployed-acceptance"]) {
    throw new Error("package.json missing platform:deployed-acceptance");
  }

  assertIncludes(checklist, "## Evidence Log", "Acceptance checklist");
  assertIncludes(checklist, "pnpm run platform:deployed-acceptance", "Acceptance checklist command");
  assertIncludes(checklist, "Render URL:", "Acceptance evidence template");
  assertIncludes(operations, "pnpm run platform:deployed-acceptance", "Operations deployed acceptance command");
  assertIncludes(operations, "Acceptance Evidence Log", "Operations acceptance artifact guidance");

  console.log("platform acceptance artifact smoke test: ok");
}

run();
