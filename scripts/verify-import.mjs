// One-off Playwright smoke test for milestone 7 (statement import: parse, map, dedupe, review, commit).

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://localhost:3001";
const fixture = fileURLToPath(new URL("./fixtures/sample-statement.csv", import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (msg) => console.log(`[console.${msg.type()}]`, msg.text()));
page.on("requestfailed", (req) => console.log("REQUEST FAILED:", req.url(), req.failure()?.errorText));

function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) process.exitCode = 1;
}

await page.goto(`${BASE}/login`);
await page.fill("#email", "father@kanakku.local");
await page.fill("#password", "kanakku-owner");
await page.click('button[type="submit"]');
await page.waitForURL("**/family");

await page.goto(`${BASE}/business/import`);
await page.setInputFiles('input[type="file"]', path.resolve(fixture));
await page.waitForSelector("text=Match each column");

// Auto-detect should have picked up Debit/Credit/Date columns already.
const dateValue = await page.locator("select").first().inputValue();
check("date column auto-detected", dateValue !== "");

const importBtn = page.locator('button:has-text("Import")');
console.log("import button disabled?", await importBtn.isDisabled());
await importBtn.click();
await page.waitForTimeout(3000);
console.log("body after import click:", (await page.textContent("body"))?.slice(0, 300));
await page.waitForSelector("text=new rows imported", { timeout: 15000 });
const summary = await page.textContent("body");
console.log("upload summary snippet:", summary?.match(/\d+ new rows imported[^.]*\./)?.[0]);
check("5 new rows imported", /5 new rows imported/.test(summary ?? ""));

await page.click('button:has-text("Review now")');
await page.waitForURL("**/business/import/*");
await page.waitForSelector("text=0 of 5 reviewed");

// Commit the first row (UPI credit 15000, defaults to household/family) -- household requires a
// member, so pick one before committing.
const firstCard = page.locator(".rounded-xl.border.border-border.bg-paper-raised").first();
await firstCard.locator("select").nth(2).selectOption({ index: 1 }); // "Who" select
await firstCard.locator('button:has-text("Commit")').click();
await page.waitForTimeout(1000);

await page.reload();
const afterOne = await page.textContent("body");
check("progress advanced to 1 of 5", /1 of 5 reviewed/.test(afterOne ?? ""));

// Ignore the rest to finish the flow cleanly.
const ignoreButtons = page.locator('button:has-text("Ignore")');
const count = await ignoreButtons.count();
for (let i = 0; i < count; i++) {
  await page.locator('button:has-text("Ignore")').first().click();
  await page.waitForTimeout(400);
}
await page.reload();
const finalBody = await page.textContent("body");
check("all rows reviewed", /All rows reviewed/.test(finalBody ?? ""));

// Re-upload the same file: dedupe should skip every row.
await page.goto(`${BASE}/business/import`);
await page.setInputFiles('input[type="file"]', path.resolve(fixture));
await page.waitForSelector("text=Match each column");
await page.click('button:has-text("Import")');
await page.waitForSelector("text=already-imported rows skipped", { timeout: 15000 });
const dedupeSummary = await page.textContent("body");
check("re-upload skips all 5 as duplicates", /0 new rows imported, 5 already-imported rows skipped/.test(dedupeSummary ?? ""));

await browser.close();
