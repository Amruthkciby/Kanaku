// One-off Playwright smoke test for milestones 4-5 (jobs, staff, FIFO payout allocation).

import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
});

async function login() {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", "father@kanakku.local");
  await page.fill("#password", "kanakku-owner");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/family");
}

function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) process.exitCode = 1;
}

await login();

// ── create two jobs with controlled event dates ─────────────────────
await page.goto(`${BASE}/business`);
await page.click('button:has-text("+ New work")');
await page.fill('input[name="title"]', "FIFO Test Job A");
await page.fill('input[name="clientName"]', "Test Client A");
await page.fill('input[name="eventDate"]', "2026-01-01");
await page.fill('input[name="agreedAmount"]', "1000");
await page.click('button:has-text("Create work")');
await page.waitForURL("**/business/jobs/*");
const jobAUrl = page.url();

await page.goto(`${BASE}/business`);
await page.click('button:has-text("+ New work")');
await page.fill('input[name="title"]', "FIFO Test Job B");
await page.fill('input[name="clientName"]', "Test Client B");
await page.fill('input[name="eventDate"]', "2026-02-01");
await page.fill('input[name="agreedAmount"]', "1000");
await page.click('button:has-text("Create work")');
await page.waitForURL("**/business/jobs/*");
const jobBUrl = page.url();

// ── create a fresh staff member (isolated from demo data) ──────────
await page.goto(`${BASE}/business/staff`);
await page.click('button:has-text("+ New staff")');
await page.fill('input[name="name"]', "FIFO Tester");
await page.click('button:has-text("Add staff")');
await page.waitForTimeout(500);
await page.reload();
await page.click('a:has-text("FIFO Tester")');
await page.waitForURL("**/business/staff/*");
const staffUrl = page.url();

// ── assign to both jobs: A=500, B=700 ────────────────────────────────
await page.goto(jobAUrl);
await page.click('button:has-text("Assign staff")');
await page.selectOption('select[name="staffId"]', { label: "FIFO Tester" });
await page.fill('input[name="agreedFee"]', "500");
await page.click('button:has-text("Assign")');
await page.waitForTimeout(500);

await page.goto(jobBUrl);
await page.click('button:has-text("Assign staff")');
await page.selectOption('select[name="staffId"]', { label: "FIFO Tester" });
await page.fill('input[name="agreedFee"]', "700");
await page.click('button:has-text("Assign")');
await page.waitForTimeout(500);

// ── payout 900: expect FIFO 500 -> A (full), 400 -> B (partial) ─────
await page.goto(staffUrl);
await page.screenshot({ path: "E:/KANAKU/.debug-staff-page.png", fullPage: true });
console.log("staffUrl:", staffUrl);
console.log("body snippet:", (await page.textContent("body"))?.slice(0, 500));
await page.click('button:has-text("Record payout")');
await page.fill('input[name="amount"]', "900");
await page.click('button:has-text("Record payout")');
await page.waitForTimeout(800);
await page.reload();

const bodyText = await page.textContent("body");
check("staff account shows 300 still owed (500+700-900)", /₹?300/.test(bodyText ?? ""));

await page.goto(jobAUrl);
let jobABody = await page.textContent("body");
check("Job A shows staff as Paid (fully allocated)", /Paid/.test(jobABody ?? ""));

await page.goto(jobBUrl);
let jobBBody = await page.textContent("body");
check("Job B shows 300 owed to staff (partial allocation)", /300/.test(jobBBody ?? ""));

// ── delete the payout, confirm balances restored ────────────────────
await page.goto(staffUrl);
page.on("response", (res) => {
  if (res.request().method() === "POST") {
    console.log("POST", res.url(), res.status());
  }
});
const deleteButton = page.locator('button:has-text("Delete")');
console.log("delete button count:", await deleteButton.count());
await deleteButton.click();
await page.waitForTimeout(2000);
await page.reload();
await page.waitForTimeout(500);
const afterDeleteBody = await page.textContent("body");
console.log("after-delete snippet:", afterDeleteBody?.slice(0, 300));
check("after deleting payout, staff owed reverts to 1,200", /1,200/.test(afterDeleteBody ?? ""));

await browser.close();
