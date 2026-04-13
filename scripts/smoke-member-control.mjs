import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "https://inspire-72132.web.app";
const email = process.argv[3];
const password = process.argv[4];

if (!email || !password) {
  console.error("Usage: node scripts/smoke-member-control.mjs <baseUrl> <email> <password>");
  process.exit(1);
}

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.resolve("output", `smoke-member-control-${runId}`);
fs.mkdirSync(outputDir, { recursive: true });

const report = {
  baseUrl,
  outputDir,
  email,
  checks: [],
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
};

let shotIndex = 0;

const writeReport = () => {
  fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
};

const pushCheck = (name, status, detail = "") => {
  report.checks.push({ name, status, detail });
};

const sanitize = (value) => value.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();

async function capture(page, label) {
  shotIndex += 1;
  const filename = `${String(shotIndex).padStart(2, "0")}-${sanitize(label)}.png`;
  await page.screenshot({
    path: path.join(outputDir, filename),
    fullPage: true,
  });
}

async function runCheck(name, action) {
  try {
    await action();
    pushCheck(name, "passed");
  } catch (error) {
    pushCheck(name, "failed", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    writeReport();
  }
}

async function waitForDashboardReady(page) {
  await page.waitForURL(/\/dashboard$/, { timeout: 30000 });
  await page.getByText("Mission tracks").waitFor({ timeout: 20000 });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    report.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    report.pageErrors.push(String(error));
  });
  page.on("requestfailed", (request) => {
    if (request.url().startsWith(baseUrl)) {
      report.requestFailures.push(
        `${request.method()} ${request.url()} -> ${request.failure()?.errorText || "Request failed"}`,
      );
    }
  });

  try {
    await runCheck("login as admin works", async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await Promise.all([
        page.locator('button[type="submit"]').click(),
        waitForDashboardReady(page),
      ]);
      await capture(page, "dashboard-after-admin-login");
    });

    await runCheck("member control page loads", async () => {
      await page.goto(`${baseUrl}/du/members`, { waitUntil: "domcontentloaded" });
      await page.getByText("Realtime member list").waitFor({ timeout: 20000 });
      await page.getByText("Profile and recovery tools").waitFor({ timeout: 20000 });
      await capture(page, "member-control-loaded");
    });

    await runCheck("member selection reveals canonical metadata", async () => {
      const rosterSection = page.locator("section").filter({ hasText: "Realtime member list" }).first();
      const firstMemberButton = rosterSection.locator("button").first();
      await firstMemberButton.waitFor({ timeout: 20000 });
      await firstMemberButton.click();
      await page.getByText("Source provider").waitFor({ timeout: 15000 });
      await page.getByText("Profile version").waitFor({ timeout: 15000 });
      await page.getByText("Current enrollment state").waitFor({ timeout: 15000 });
      await capture(page, "member-control-selected");
    });
  } finally {
    await browser.close();
    writeReport();
  }

  const failures = report.checks.filter((check) => check.status === "failed");
  if (failures.length || report.pageErrors.length || report.consoleErrors.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  report.fatal = error instanceof Error ? error.message : String(error);
  writeReport();
  console.error(error);
  process.exit(1);
});
