// Smoke test for PDF bank statement import.

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://localhost:3001";
const fixture = fileURLToPath(new URL("./fixtures/sample-statement.pdf", import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (msg) => msg.type() === "error" && console.log("[console.error]", msg.text()));

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

await page.waitForSelector("text=Reading the PDF", { timeout: 5000 }).catch(() => {});
await page.waitForSelector("text=Match each column", { timeout: 15000 });
check("PDF text extracted into a mappable table", true);

const bodyText = await page.textContent("body");
check("extracted preview shows a real narration", /SUPPLIER PAYMENT|CLIENT ABC|STAFF PAYOUT/.test(bodyText ?? ""));

const dateValue = await page.locator("select").first().inputValue();
check("date column auto-detected from PDF table", dateValue !== "");

await page.click('button:has-text("Import")');
await page.waitForSelector("text=new rows imported", { timeout: 15000 });
const summary = await page.textContent("body");
console.log("import summary:", summary?.match(/\d+ new rows imported[^.]*\./)?.[0]);
check("4 rows imported from the PDF", /4 new rows imported/.test(summary ?? ""));

await page.click('button:has-text("Review now")');
await page.waitForURL("**/business/import/*");
const reviewBody = await page.textContent("body");
console.log("review snippet:", reviewBody?.slice(0, 600));
check("NEFT credit (₹25,000) parsed into the credit column, not debit", /25,000/.test(reviewBody ?? ""));
check("ATM withdrawal (₹3,000) parsed as a debit", /3,000/.test(reviewBody ?? ""));

await browser.close();
