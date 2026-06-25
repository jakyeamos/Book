import { spawnSync } from "node:child_process";

interface EvidenceLine {
  check: string;
  status: "pass" | "fail";
  evidence: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for deployed acceptance`);
  }
  return value.trim();
}

function cleanBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

async function fetchText(url: string, options: RequestInit = {}): Promise<{ status: number; text: string; headers: Headers }> {
  const response = await fetch(url, options);
  return {
    status: response.status,
    text: await response.text(),
    headers: response.headers,
  };
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<{ status: number; body: T; headers: Headers }> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return {
    status: response.status,
    body: await response.json() as T,
    headers: response.headers,
  };
}

function runFullstackSmoke(): EvidenceLine[] {
  const result = spawnSync("pnpm", ["run", "platform:fullstack-smoke"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    const evidence = (result.stderr || result.stdout || "pnpm run platform:fullstack-smoke failed").trim();
    return [
      {
        check: "Deployed full-stack smoke",
        status: "fail",
        evidence,
      },
      {
        check: "DOCX import creates staged draft over HTTP",
        status: "fail",
        evidence,
      },
      {
        check: "Import metadata edits persist over HTTP",
        status: "fail",
        evidence,
      },
      {
        check: "Chapter order/type/visibility survives live HTTP reload",
        status: "fail",
        evidence,
      },
    ];
  }

  return [
    {
      check: "Deployed full-stack smoke",
      status: "pass",
      evidence: "platform:fullstack-smoke exited 0 against BOOK_SMOKE_BASE_URL",
    },
    {
      check: "DOCX import creates staged draft over HTTP",
      status: "pass",
      evidence: "platform:fullstack-smoke imported DOCX content through /api/admin/import/docx and observed staged status",
    },
    {
      check: "Import metadata edits persist over HTTP",
      status: "pass",
      evidence: "platform:fullstack-smoke updated draft title, type, order, and visibility before approval",
    },
    {
      check: "Chapter order/type/visibility survives live HTTP reload",
      status: "pass",
      evidence: "platform:fullstack-smoke updated approved chapter settings and reloaded them from chapter detail and list APIs",
    },
  ];
}

function renderMarkdown(baseUrl: string, evidence: EvidenceLine[]): string {
  const status = evidence.every((line) => line.status === "pass") ? "PASS" : "FAIL";
  const lines = [
    `# Author Studio Deployed Acceptance Evidence`,
    ``,
    `Date: ${new Date().toISOString()}`,
    `Render URL: ${baseUrl}`,
    `Status: ${status}`,
    ``,
    `| Check | Status | Evidence |`,
    `|---|---|---|`,
  ];

  for (const line of evidence) {
    lines.push(`| ${line.check} | ${line.status.toUpperCase()} | ${line.evidence.replace(/\|/g, "\\|")} |`);
  }

  return `${lines.join("\n")}\n`;
}

async function run(): Promise<void> {
  const baseUrl = cleanBaseUrl(requireEnv("BOOK_SMOKE_BASE_URL"));
  requireEnv("BOOK_SMOKE_ADMIN_EMAIL");
  requireEnv("BOOK_SMOKE_ADMIN_PASSWORD");

  const evidence: EvidenceLine[] = [];
  evidence.push(...runFullstackSmoke());

  const readiness = await fetchJson<{ ok: boolean; checks?: Record<string, boolean> }>(`${baseUrl}/api/deploy/readiness`);
  evidence.push({
    check: "Readiness endpoint",
    status: readiness.status === 200 && readiness.body.ok ? "pass" : "fail",
    evidence: `HTTP ${readiness.status}; checks=${JSON.stringify(readiness.body.checks ?? {})}`,
  });

  const readerShell = await fetchText(`${baseUrl}/`);
  evidence.push({
    check: "Reader root served by Node",
    status: readerShell.status === 200 && readerShell.headers.get("x-book-platform") === "node" ? "pass" : "fail",
    evidence: `HTTP ${readerShell.status}; platform=${readerShell.headers.get("x-book-platform") ?? ""}`,
  });

  const login = await fetchText(`${baseUrl}/login`);
  evidence.push({
    check: "Login shell",
    status: login.status === 200 && login.text.includes("Book Account") && login.headers.get("x-book-platform") === "node" ? "pass" : "fail",
    evidence: `HTTP ${login.status}; shell=${login.text.includes("Book Account")}; platform=${login.headers.get("x-book-platform") ?? ""}`,
  });

  const anonymousAdmin = await fetchText(`${baseUrl}/admin`, { redirect: "manual" });
  evidence.push({
    check: "Admin route protection",
    status: anonymousAdmin.status === 302
      && anonymousAdmin.headers.get("location")?.startsWith("/login") === true
      && anonymousAdmin.headers.get("x-book-platform") === "node" ? "pass" : "fail",
    evidence: `HTTP ${anonymousAdmin.status}; location=${anonymousAdmin.headers.get("location") ?? ""}; platform=${anonymousAdmin.headers.get("x-book-platform") ?? ""}`,
  });

  const markdown = renderMarkdown(baseUrl, evidence);
  process.stdout.write(markdown);

  if (evidence.some((line) => line.status === "fail")) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
