import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const projectRoot = process.cwd();
const testRoot = path.join(projectRoot, ".tmp", "text-answer-ui-test");
const toViteFsPath = (filePath) => `/@fs/${path.resolve(projectRoot, filePath).replace(/\\/g, "/")}`;

const appSource = `
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TextAnswerInput } from "${toViteFsPath("src/components/forms/TextAnswerField.jsx")}";
import { LinkAnswerInput } from "${toViteFsPath("src/components/forms/LinkAnswerField.jsx")}";
import { isTextAnswerValid } from "${toViteFsPath("src/utils/textValidation.js")}";
import { isLinkAnswerValid } from "${toViteFsPath("src/utils/linkValidation.js")}";

function App() {
  const [answer, setAnswer] = useState("");
  const [link, setLink] = useState("");

  return (
    <main>
      <label htmlFor="answer">Answer</label>
      <TextAnswerInput
        id="answer"
        aria-label="answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
      />
      <label htmlFor="link">Link</label>
      <LinkAnswerInput
        id="link"
        aria-label="link"
        value={link}
        onChange={(event) => setLink(event.target.value)}
      />
      <button id="submit" disabled={!isTextAnswerValid(answer) || !isLinkAnswerValid(link)}>Submit</button>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
`;

const assertTextCount = async (page, expectedText) => {
  assert.equal(await page.getByText(expectedText).count(), 1);
};

await fs.rm(testRoot, { recursive: true, force: true });
await fs.mkdir(path.join(testRoot, "src"), { recursive: true });
await fs.writeFile(
  path.join(testRoot, "index.html"),
  '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/App.jsx"></script></body></html>',
);
await fs.writeFile(path.join(testRoot, "src", "App.jsx"), appSource);

let browser;
let server;

try {
  server = await createServer({
    root: testRoot,
    configFile: false,
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  await server.listen();

  const [url] = server.resolvedUrls?.local || [];
  assert.ok(url, "Vite test server did not expose a local URL.");

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);

  const input = page.getByLabel("answer");
  const linkInput = page.getByLabel("link");
  const submit = page.locator("#submit");
  const errorMessage = "กรุณากรอกคำตอบอย่างน้อย 15 ตัวอักษร";
  const linkErrorMessage = "กรุณากรอกลิงก์ที่ถูกต้อง โดยขึ้นต้นด้วย http:// หรือ https://";

  assert.equal(await page.getByText("0/15 ตัวอักษร").count(), 2);
  assert.equal(await submit.isDisabled(), true);

  await input.fill("short");
  await assertTextCount(page, "5/15 ตัวอักษร");
  assert.equal(await page.getByText(errorMessage).isVisible(), true);
  assert.equal(await submit.isDisabled(), true);

  await input.fill("123456789012345");
  await assertTextCount(page, "15/15 ตัวอักษร");
  assert.equal(await page.getByText(errorMessage).count(), 0);
  assert.equal(await submit.isDisabled(), true);

  await linkInput.fill("drive.google.com/file/d/example/view");
  assert.equal(await page.getByText(linkErrorMessage).isVisible(), true);
  assert.equal(await submit.isDisabled(), true);

  await linkInput.fill("https://drive.google.com/file/d/example/view");
  assert.equal(await page.getByText(linkErrorMessage).count(), 0);
  assert.equal(await page.getByText("ลิงก์ถูกต้อง").isVisible(), true);
  assert.equal(await submit.isEnabled(), true);

  await input.fill("ก".repeat(15));
  await assertTextCount(page, "15/15 ตัวอักษร");
  assert.equal(await submit.isEnabled(), true);

  await input.fill("               ");
  await input.blur();
  await assertTextCount(page, "0/15 ตัวอักษร");
  assert.equal(await page.getByText(errorMessage).isVisible(), true);
  assert.equal(await submit.isDisabled(), true);

  console.log("PASS text answer UI validates counter, error state, and submit guard.");
} finally {
  await browser?.close();
  await server?.close();
  await fs.rm(testRoot, { recursive: true, force: true });
}
