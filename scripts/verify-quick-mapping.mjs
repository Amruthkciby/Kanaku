// Smoke test for the quick client-name / staff-name mapping on the Work tab's quick-entry form
// (moved here from the Add screen, which is household-only now).

import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) process.exitCode = 1;
}

await page.goto(`${BASE}/login`);
await page.fill("#email", "father@kanakku.local");
await page.fill("#password", "kanakku-owner");
await page.click('button[type="submit"]');
await page.waitForURL("**/family");

// ── quick client payment: brand new client name, no existing job ───
await page.goto(`${BASE}/business`);
await page.waitForSelector('button:has-text("+ Add / mark a work expense")');
await page.click('button:has-text("+ Add / mark a work expense")');
await page.fill('input[placeholder="Client name"]', "Fresh New Client XYZ");
const newHint = await page.locator("text=New — added automatically.").count();
check("shows 'new' hint for an unmatched name", newHint > 0);

// default direction on the quick form is "Received" for a client -- confirm, then submit
await page.click('button:has-text("Received")');
await page.fill('input[placeholder="0"]', "7500");
await page.click('button:has-text("Save entry")');
await page.waitForTimeout(1500);

// Confirm a job was auto-created with that client name and the payment landed on it.
await page.goto(`${BASE}/business?filter=all`);
await page.waitForSelector("text=Fresh New Client XYZ", { timeout: 5000 });
check("auto-created job appears in the work list", true);

await page.click("text=Fresh New Client XYZ");
await page.waitForURL("**/business/jobs/*");
const jobBody = await page.textContent("body");
check("job detail shows the ₹7,500 payment", /7,500/.test(jobBody ?? ""));
check("agreed amount defaulted to the payment (still to collect ₹0)", /Still to collect[\s\S]{0,40}₹0/.test(jobBody ?? "") || /₹0[\s\S]{0,10}Still to collect/.test(jobBody ?? ""));

// ── quick staff payout: brand new staff name ────────────────────────
await page.goto(`${BASE}/business`);
await page.click('button:has-text("+ Add / mark a work expense")');
await page.click('button:has-text("Staff")');
await page.fill('input[placeholder="Staff name"]', "Brand New Staffer");
await page.fill('input[placeholder="0"]', "3000");
await page.click('button:has-text("Save entry")');
await page.waitForTimeout(1500);

await page.goto(`${BASE}/business/staff`);
await page.waitForSelector("text=Brand New Staffer", { timeout: 5000 });
check("auto-created staff member appears in staff list", true);

const staffBody = await page.textContent("body");
check("new staff shows as Settled (no obligations, full amount unallocated)", /Brand New Staffer[\s\S]{0,60}Settled/.test(staffBody ?? ""));

await browser.close();
