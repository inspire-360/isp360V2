import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:4174";
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.resolve("output", `smoke-auth-${runId}`);
const email = `codex.smoke.${Date.now()}@example.com`;
const password = `SmokePass!${Date.now()}Aa`;
const schoolName = `Codex School ${Date.now()}`;
const followUpNote = `Follow-up ${Date.now()}`;
const sosSummary = `Smoke SOS ${Date.now()}`;
const sosDetails = "Smoke test request to verify SOS creation, follow-up, and status updates.";

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

const pushCheck = (name, status, detail = "") => {
  report.checks.push({ name, status, detail });
};

const writeReport = () => {
  fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
};

const sanitize = (value) => value.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
const isIgnorableThirdPartyConsoleError = (value = "") =>
  value.includes("chpspace.my.canva.site") && value.includes("frame-ancestors");
const isIgnorableConsoleError = (value = "") =>
  value.includes("ส่งสถานะคงค้างก่อนออกจากหน้าไม่สำเร็จ");

async function waitForDashboardReady(page) {
  await page.waitForURL(/\/dashboard$/, { timeout: 30000 });
  await page.getByText("Mission tracks").waitFor({ timeout: 20000 });
}

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

async function clickCourseCardButton(page, courseTitle) {
  const card = page.locator("article").filter({ hasText: courseTitle }).first();
  await card.waitFor({ state: "visible", timeout: 20000 });
  await card.locator("button").last().click();
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
    if (isIgnorableConsoleError(text) || isIgnorableThirdPartyConsoleError(text)) return;
    report.consoleErrors.push(text);
  });
  page.on("pageerror", (error) => {
    report.pageErrors.push(String(error));
  });
  page.on("requestfailed", (request) => {
    const failureText = request.failure()?.errorText || "Request failed";
    if (request.url().startsWith(baseUrl)) {
      report.requestFailures.push(`${request.method()} ${request.url()} -> ${failureText}`);
    }
  });

  try {
    await runCheck("landing page loads", async () => {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await page.getByRole("navigation").getByRole("link", { name: "เข้าสู่ระบบ" }).waitFor({ timeout: 15000 });
      await capture(page, "landing");
    });

    await runCheck("register learner account", async () => {
      await page.goto(`${baseUrl}/register`, { waitUntil: "domcontentloaded" });
      await page.locator('input[name="firstName"]').fill("Codex");
      await page.locator('input[name="lastName"]').fill("Smoke");
      await page.locator('input[name="school"]').fill("Smoke School");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="confirmPassword"]').fill(password);
      await page.locator('#pdpa').check();
      await capture(page, "register-filled");
      await Promise.all([
        page.locator('button[type="submit"]').click(),
        waitForDashboardReady(page),
      ]);
      await capture(page, "dashboard-after-register");
    });

    await runCheck("learner access guard blocks admin routes", async () => {
      await page.goto(`${baseUrl}/du/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
      await page.goto(`${baseUrl}/du/members`, { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
      await capture(page, "learner-admin-guard");
    });

    await runCheck("profile save roundtrip works", async () => {
      await page.goto(`${baseUrl}/profile`, { waitUntil: "domcontentloaded" });
      await page.locator('input[name="school"]').waitFor({ timeout: 15000 });
      await page.locator('input[name="school"]').fill(schoolName);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2500);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator('input[name="school"]').waitFor({ timeout: 15000 });
      const savedSchool = await page.locator('input[name="school"]').inputValue();
      if (savedSchool !== schoolName) {
        throw new Error(`Expected saved school to be "${schoolName}" but got "${savedSchool}"`);
      }
      await capture(page, "profile-saved");
    });

    await runCheck("student course enrollment works", async () => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      await clickCourseCardButton(page, "InSPIRE for Student");
      await page.waitForURL(/\/course\/student$/, { timeout: 20000 });
      await page.locator("iframe").waitFor({ timeout: 15000 });
      await capture(page, "student-course");
    });

    await runCheck("teacher course enrollment works", async () => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      await clickCourseCardButton(page, "InSPIRE for Teacher");
      await page.locator('input[placeholder="ENTER CODE"]').fill("TEACHER2024");
      await Promise.all([
        page.waitForURL(/\/course\/teacher/, { timeout: 30000 }),
        page.getByRole("button", { name: /Confirm and enroll/i }).click(),
      ]);
      const guardLoader = page.getByText("กำลังตรวจสอบสิทธิ์การเข้าเรียน...");
      if (await guardLoader.isVisible().catch(() => false)) {
        await guardLoader.waitFor({ state: "hidden", timeout: 30000 });
      }
      await page.locator("main").getByText(/XP/).first().waitFor({ timeout: 30000 });
      await capture(page, "teacher-course");
    });

    await runCheck("my courses show firebase enrollments", async () => {
      await page.goto(`${baseUrl}/courses`, { waitUntil: "domcontentloaded" });
      await page.locator("text=InSPIRE for Student").waitFor({ timeout: 15000 });
      await page.locator("text=InSPIRE for Teacher").waitFor({ timeout: 15000 });
      await capture(page, "my-courses");
    });

    await runCheck("teacher sos request create and follow-up works", async () => {
      await page.goto(`${baseUrl}/du/sos`, { waitUntil: "domcontentloaded" });
      const sosForm = page.locator("form").first();
      const sosInputs = sosForm.locator("input");
      await sosInputs.nth(0).fill(sosSummary);
      await sosInputs.nth(1).fill("Smoke Team");
      await sosForm.locator('textarea[rows="6"]').fill(sosDetails);
      await sosForm.locator('button[type="submit"]').click();
      const caseCard = page.locator("article").filter({ hasText: sosSummary }).last();
      await caseCard.waitFor({ timeout: 20000 });
      const followUpArea = page.locator('form').filter({ has: page.locator('textarea[rows="4"]') }).last().locator('textarea[rows="4"]');
      await followUpArea.waitFor({ timeout: 20000 });
      await followUpArea.fill(followUpNote);
      await page.locator('form').filter({ has: page.locator('textarea[rows="4"]') }).last().locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
      await page.locator("p.whitespace-pre-wrap").filter({ hasText: followUpNote }).last().waitFor({
        timeout: 20000,
      });
      await capture(page, "sos-flow");
    });

    await runCheck("logout works", async () => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      const logoutButton = page.locator("button", {
        has: page.locator("svg.lucide-log-out"),
      });
      await logoutButton.waitFor({ timeout: 15000 });
      await Promise.all([
        page.waitForURL(/\/$/, { timeout: 20000 }),
        logoutButton.click(),
      ]);
      await capture(page, "after-logout");
    });

    await runCheck("login with created account works", async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await Promise.all([
        page.locator('button[type="submit"]').click(),
        waitForDashboardReady(page),
      ]);
      await capture(page, "dashboard-after-login");
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
