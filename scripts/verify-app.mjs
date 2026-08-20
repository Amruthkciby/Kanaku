// One-off Playwright smoke test for the app shell / auth flow, run against the local dev
// server. Not part of any permanent test suite — just used to visually verify milestone 1.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const shotsDir = fileURLToPath(new URL("../.verify-shots/", import.meta.url));
mkdirSync(shotsDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function shot(page, name) {
  await page.screenshot({ path: `${shotsDir}${name}`, fullPage: true });
}

async function loginAs(page, email, password) {
  await page.goto("http://localhost:3001/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/family", { timeout: 10000 });
}

// ── mobile: login page ──────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`[mobile login] ${e.message}`));
  await page.goto("http://localhost:3001/login");
  await page.waitForSelector("text=Kanakku");
  await shot(page, "01-login-mobile.png");
  await context.close();
}

// ── desktop: login page ─────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`[desktop login] ${e.message}`));
  await page.goto("http://localhost:3001/login");
  await page.waitForSelector("text=Kanakku");
  await shot(page, "02-login-desktop.png");
  await context.close();
}

// ── mobile: owner signed in ─────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`[mobile owner] ${e.message}`));
  await loginAs(page, "father@kanakku.local", "kanakku-owner");
  await page.waitForSelector("text=Safe to spend");
  const hasBusinessTab = await page.locator("nav >> text=ജോലി").count();
  console.log(`mobile owner: Business tab present = ${hasBusinessTab > 0}`);
  await shot(page, "03-family-owner-mobile.png");
  await context.close();
}

// ── desktop: owner signed in ────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`[desktop owner] ${e.message}`));
  await loginAs(page, "father@kanakku.local", "kanakku-owner");
  await page.waitForSelector("text=Safe to spend");
  const hasBusinessTab = await page.locator("aside >> text=ജോലി").count();
  console.log(`desktop owner: Business tab present = ${hasBusinessTab > 0}`);
  await shot(page, "04-family-owner-desktop.png");

  await page.click("aside >> text=ജോലി");
  await page.waitForURL("**/business");
  await shot(page, "05-business-owner-desktop.png");
  await context.close();
}

// ── mobile: member signed in — must NOT see Business ────────────────
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`[mobile member] ${e.message}`));
  await loginAs(page, "me@kanakku.local", "kanakku-member");
  await page.waitForSelector("text=Safe to spend");
  const hasBusinessTab = await page.locator("nav >> text=ജോലി").count();
  console.log(`mobile member: Business tab present = ${hasBusinessTab > 0} (should be false)`);
  await shot(page, "06-family-member-mobile.png");

  // Try to force-navigate to /business anyway — should redirect to /family.
  await page.goto("http://localhost:3001/business");
  await page.waitForURL("**/family");
  console.log("member forced to /business -> redirected to /family: OK");
  await context.close();
}

await browser.close();

console.log(`\nScreenshots in ${shotsDir}`);
if (errors.length) {
  console.log("\nPage errors encountered:");
  for (const e of errors) console.log(" -", e);
  process.exit(1);
} else {
  console.log("No page errors.");
}
