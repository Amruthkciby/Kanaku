// Smoke test for the Add screen: household-only for everyone now (owner included) -- client
// payments, job expenses, and staff payouts moved to the Work tab's quick-entry form.

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
let clientChip = await page.locator('button:has-text("+ Client")').count();
let staffChip = await page.locator('button:has-text("+ Staff")').count();
check("member sees no + Client chip", clientChip === 0);
check("member sees no + Staff chip", staffChip === 0);

await page.fill("#amount", "150");
await page.getByRole("button", { name: "Fuel", exact: true }).click();
const memberHouseholdBtn = page.getByRole("button", { name: "Me", exact: true }).first();
await memberHouseholdBtn.click();
await page.click('button:has-text("Save entry")');
await page.waitForSelector("text=Entry recorded.", { timeout: 5000 });
check("member can still record a household entry on the unified form", true);

// ── owner: Add is also household-only now -- no Client/Staff chips either ──
page = await newSignedInPage("father@kanakku.local", "kanakku-owner");
await page.goto(`${BASE}/add`);
await page.waitForSelector("#amount");
clientChip = await page.locator('button:has-text("+ Client")').count();
staffChip = await page.locator('button:has-text("+ Staff")').count();
check("owner sees no + Client chip on Add (moved to Work)", clientChip === 0);
check("owner sees no + Staff chip on Add (moved to Work)", staffChip === 0);

await page.fill("#amount", "220");
await page.getByRole("button", { name: "Fuel", exact: true }).click();
await page.getByRole("button", { name: "Father", exact: true }).click();
await page.click('button:has-text("Save entry")');
await page.waitForSelector("text=Entry recorded.", { timeout: 5000 });
check("owner can record a household entry on the unified form", true);

// ── owner: the quick client/staff entry point now lives on the Work tab ──
await page.goto(`${BASE}/business`);
const quickEntryBtn = page.locator('button:has-text("+ Add / mark a work expense")');
check("Work tab offers the quick client/staff entry point", (await quickEntryBtn.count()) > 0);

await browser.close();
