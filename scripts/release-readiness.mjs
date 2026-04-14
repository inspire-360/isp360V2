import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const OUTPUT_ROOT = path.resolve("output");
const SUITE_PREFIX_MAP = {
  "smoke-auth": "smoke-auth-",
  "smoke-admin-console": "smoke-admin-console-",
  "smoke-member-control": "smoke-member-control-",
};

const parseArgs = (argv) =>
  argv.reduce((accumulator, token, index, items) => {
    if (!token.startsWith("--")) return accumulator;

    const key = token.slice(2);
    const next = items[index + 1];
    accumulator[key] = next && !next.startsWith("--") ? next : "true";
    return accumulator;
  }, {});

const args = parseArgs(process.argv.slice(2));
const requiredSuites = String(args.require || "smoke-auth,smoke-admin-console")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const optionalSuites = String(args.optional || "smoke-member-control")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .filter((item) => !requiredSuites.includes(item));

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const summaryOutputPath = path.join(OUTPUT_ROOT, `release-readiness-${timestamp}.json`);

const ensureOutputRoot = () => {
  if (!fs.existsSync(OUTPUT_ROOT)) {
    fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  }
};

const toMillis = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const readLatestReport = (suiteId) => {
  const prefix = SUITE_PREFIX_MAP[suiteId];
  if (!prefix) {
    return {
      suiteId,
      status: "unknown-suite",
      detail: `No suite prefix mapping configured for ${suiteId}`,
    };
  }

  if (!fs.existsSync(OUTPUT_ROOT)) {
    return {
      suiteId,
      status: "missing",
      detail: "Output directory does not exist yet",
    };
  }

  const latestDirectory = fs
    .readdirSync(OUTPUT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => {
      const reportPath = path.join(OUTPUT_ROOT, entry.name, "report.json");
      const stats = fs.existsSync(reportPath) ? fs.statSync(reportPath) : null;

      return {
        name: entry.name,
        reportPath,
        mtimeMs: stats?.mtimeMs || 0,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs)[0];

  if (!latestDirectory || !fs.existsSync(latestDirectory.reportPath)) {
    return {
      suiteId,
      status: "missing",
      detail: `No report found for ${suiteId}`,
    };
  }

  const report = JSON.parse(fs.readFileSync(latestDirectory.reportPath, "utf8"));
  const failedChecks = (report.checks || []).filter((check) => check.status !== "passed");
  const hasBlockingErrors =
    failedChecks.length > 0 ||
    (report.consoleErrors || []).length > 0 ||
    (report.pageErrors || []).length > 0 ||
    (report.requestFailures || []).length > 0;

  return {
    suiteId,
    status: hasBlockingErrors ? "failed" : "passed",
    outputDir: report.outputDir || path.join(OUTPUT_ROOT, latestDirectory.name),
    reportPath: latestDirectory.reportPath,
    timestamp:
      report.generatedAt ||
      report.completedAt ||
      report.startedAt ||
      (latestDirectory.mtimeMs ? new Date(latestDirectory.mtimeMs).toISOString() : ""),
    checkCount: Array.isArray(report.checks) ? report.checks.length : 0,
    failedChecks: failedChecks.map((check) => ({
      name: check.name,
      detail: check.detail || "",
    })),
    consoleErrors: report.consoleErrors || [],
    pageErrors: report.pageErrors || [],
    requestFailures: report.requestFailures || [],
  };
};

const buildSummary = () => {
  const required = requiredSuites.map(readLatestReport);
  const optional = optionalSuites.map(readLatestReport);
  const requiredFailures = required.filter((suite) => suite.status !== "passed");

  return {
    generatedAt: new Date().toISOString(),
    requiredSuites,
    optionalSuites,
    overallStatus: requiredFailures.length === 0 ? "passed" : "failed",
    required,
    optional,
  };
};

const printSuiteBlock = (suite) => {
  const lines = [
    `${suite.suiteId}: ${suite.status}`,
    suite.reportPath ? `  report: ${suite.reportPath}` : null,
    suite.outputDir ? `  output: ${suite.outputDir}` : null,
    suite.timestamp ? `  timestamp: ${suite.timestamp}` : null,
    Number.isFinite(suite.checkCount) ? `  checks: ${suite.checkCount}` : null,
  ].filter(Boolean);

  if (suite.failedChecks?.length) {
    suite.failedChecks.forEach((check) => {
      lines.push(`  failed-check: ${check.name}${check.detail ? ` -> ${check.detail}` : ""}`);
    });
  }

  if (suite.consoleErrors?.length) {
    suite.consoleErrors.forEach((item) => lines.push(`  console-error: ${item}`));
  }

  if (suite.pageErrors?.length) {
    suite.pageErrors.forEach((item) => lines.push(`  page-error: ${item}`));
  }

  if (suite.requestFailures?.length) {
    suite.requestFailures.forEach((item) => lines.push(`  request-failure: ${item}`));
  }

  if (suite.detail) {
    lines.push(`  detail: ${suite.detail}`);
  }

  return lines.join("\n");
};

ensureOutputRoot();

const summary = buildSummary();
fs.writeFileSync(summaryOutputPath, JSON.stringify(summary, null, 2));

console.log(`Release readiness: ${summary.overallStatus}`);
console.log(`Summary: ${summaryOutputPath}`);
console.log("");
console.log("Required suites:");
summary.required.forEach((suite) => {
  console.log(printSuiteBlock(suite));
  console.log("");
});

if (summary.optional.length > 0) {
  console.log("Optional suites:");
  summary.optional.forEach((suite) => {
    console.log(printSuiteBlock(suite));
    console.log("");
  });
}

process.exitCode = summary.overallStatus === "passed" ? 0 : 1;
