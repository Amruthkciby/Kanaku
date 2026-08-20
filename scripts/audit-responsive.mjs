// Screenshots key pages across a spread of real-world viewport sizes to find actual responsive
// bugs, rather than guessing. Not a permanent test -- a one-off design audit tool.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3001";
const shotsDir = "E:/KANAKU/.audit-shots/";
mkdirSync(shotsDir, { recursive: true });

const VIEWPORTS = [
  { name: "360-small-phone", width: 360, height: 740 },
  { name: "390-phone", width: 390, height: 844 },
  { name: "768-tablet", width: 768, height: 1024 },
  { name: "1024-laptop-sm", width: 1024, height: 768 },
  { name: "1440-laptop", width: 1440, height: 900 },
  { name: "1920-desktop", width: 1920, height: 1080 },
];

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

await page.goto(`${BASE}/login`);
await page.fill("#email", "father@kanakku.local");
await page.fill("#password", "kanakku-owner");
await page.click('button[type="submit"]');
await page.waitForURL("**/family");

const PAGES = [
  { path: "/login", auth: false, wait: "text=Kanakku" },
  { path: "/family", auth: true, wait: "text=Safe to spend" },
  { path: "/add", auth: true, wait: "#amount" },
  { path: "/business", auth: true, wait: "text=ജോലി" },
  { path: "/business/staff", auth: true, wait: "text=ജോലിക്കാർ" },
  { path: "/more", auth: true, wait: "text=Accounts" },
];

for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const p of PAGES) {
    if (!p.auth) continue; // already logged in; skip re-testing /login here for brevity
    await page.goto(`${BASE}${p.path}`);
    await page.waitForSelector(p.wait, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);
    const name = `${vp.name}__${p.path.replace(/\//g, "-") || "root"}.png`;
    await page.screenshot({ path: `${shotsDir}${name}`, fullPage: true });
    console.log("captured", name);
  }
}

// Login page separately (logged-out context)
const outContext = await browser.newContext();
const outPage = await outContext.newPage();
for (const vp of VIEWPORTS) {
  await outPage.setViewportSize({ width: vp.width, height: vp.height });
  await outPage.goto(`${BASE}/login`);
  await outPage.waitForSelector("text=Kanakku");
  await outPage.screenshot({ path: `${shotsDir}${vp.name}__login.png`, fullPage: true });
  console.log("captured", `${vp.name}__login.png`);
}

await browser.close();
console.log("done ->", shotsDir);
