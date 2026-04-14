import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "https://inspire-72132.web.app";
const email = process.argv[3];
const password = process.argv[4];

if (!email || !password) {
  console.error("Usage: node scripts/smoke-admin-console.mjs <baseUrl> <email> <password>");
  process.exit(1);
}

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.resolve("output", `smoke-admin-console-${runId}`);
fs.mkdirSync(outputDir, { recursive: true });

const report = {
  baseUrl,
  outputDir,
  email,
  passwordRedacted: true,
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
const isIgnorableConsoleError = (value = "") =>
  value.includes("ส่งสถานะคงค้างก่อนออกจากหน้าไม่สำเร็จ");

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

async function clickRouteCard(page, title) {
  const card = page.locator("a").filter({ hasText: title }).first();
  await card.waitFor({ timeout: 20000 });
  await card.click();
}

async function waitForRouteCard(page, title) {
  const titlePattern = new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  const card = page.getByRole("link", { name: titlePattern }).first();
  await card.waitFor({ timeout: 20000 });
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
    const text = message.text();
    if (isIgnorableConsoleError(text)) return;
    report.consoleErrors.push(text);
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

    await runCheck("admin console summary loads", async () => {
      await page.goto(`${baseUrl}/du/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/du\/admin$/, { timeout: 20000 });
      await waitForRouteCard(page, "Learning Progress");
      await waitForRouteCard(page, "SOS Workspace");
      await waitForRouteCard(page, "Video Coach");
      await waitForRouteCard(page, "Innovation Board");
      await waitForRouteCard(page, "Expert Matching");
      await page.getByText("Progressive Admin Workspace").waitFor({ timeout: 20000 });
      await capture(page, "admin-console-summary");
    });

    await runCheck("admin console route cards navigate correctly", async () => {
      await clickRouteCard(page, "Video Coach");
      await page.waitForURL(/\/du\/video-coach$/, { timeout: 20000 });
      await capture(page, "admin-route-video-coach");

      await page.goto(`${baseUrl}/du/admin`, { waitUntil: "domcontentloaded" });
      await clickRouteCard(page, "Expert Matching");
      await page.waitForURL(/\/du\/matchmaker$/, { timeout: 20000 });
      await capture(page, "admin-route-expert-matching");
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
