// Smoke test for the unified Add screen (one continuous form, family/business tagged silently
// underneath, replacing the old ledger-toggle + separate forms).

import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const browser = await chromium.launch();

function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) process.exitCode = 1;
}

async function newSignedInPage(email, password) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/family");
  return page;
}

// ── member: no Client/Staff chips at all, only household + normal family flow ──
let page = await newSignedInPage("me@kanakku.local", "kanakku-member");
await page.goto(`${BASE}/add`);
await page.waitForSelector("#amount");
const memberSeesClientChip = await page.locator('button:has-text("+ Client")').count();
const memberSeesStaffChip = await page.locator('button:has-text("+ Staff")').count();
check("member sees no + Client chip", memberSeesClientChip === 0);
check("member sees no + Staff chip", memberSeesStaffChip === 0);

await page.fill("#amount", "150");
await page.getByRole("button", { name: "Fuel", exact: true }).click();
const memberHouseholdBtn = page.getByRole("button", { name: "Me", exact: true }).first();
await memberHouseholdBtn.click();
await page.click('button:has-text("Save entry")');
await page.waitForSelector("text=Entry recorded.", { timeout: 5000 });
check("member can still record a household entry on the unified form", true);

// ── owner: no visible ledger toggle text anymore ──
page = await newSignedInPage("father@kanakku.local", "kanakku-owner");
await page.goto(`${BASE}/add`);
await page.waitForSelector("#amount");
const oldToggleGone = await page.locator('[role="tablist"][aria-label="Ledger"]').count();
check("old Family/Business segmented control is gone", oldToggleGone === 0);

// ── owner: quick client payment (new client, auto-created job) ──
await page.click('button:has-text("+ Client")');
await page.fill('input[placeholder="Client name"]', "Unified Test Client");
await page.click('button:has-text("Received")');
await page.fill("#amount", "6000");
await page.click('button:has-text("Save entry")');
await page.waitForSelector("text=Entry recorded.", { timeout: 5000 });

await page.goto(`${BASE}/business?filter=all`);
await page.waitForSelector("text=Unified Test Client", { timeout: 5000 });
check("quick client payment auto-created a job, visible in Jobs", true);

// ── owner: quick staff payout (new staff) ──
await page.goto(`${BASE}/add`);
await page.waitForSelector("#amount");
await page.click('button:has-text("+ Staff")');
const spentBtn = page.locator('button:has-text("Spent")');
check("Spent/Received locked to Spent for staff", await spentBtn.isDisabled());
await page.fill('input[placeholder="Staff name"]', "Unified Test Staffer");
await page.fill("#amount", "2500");
await page.click('button:has-text("Save entry")');
await page.waitForSelector("text=Entry recorded.", { timeout: 5000 });

await page.goto(`${BASE}/business/staff`);
await page.waitForSelector("text=Unified Test Staffer", { timeout: 5000 });
check("quick staff payout auto-created a staff member", true);

await browser.close();
