// Smoke test for the inactivity lock screen (added after the user reported that closing the
// tab and coming back leaves the app fully accessible with no re-auth).

import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const browser = await chromium.launch();
const page = await browser.newPage();
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
await page.waitForSelector("text=Safe to spend");

// Fresh session: should NOT be locked.
let locked = await page.locator("text=Locked after inactivity").count();
check("not locked right after login", locked === 0);

// Simulate "closed the tab and came back 20 minutes later" by backdating last-active in
// localStorage (which is what actually persists across a real tab close) and reloading.
await page.evaluate(() => {
  localStorage.setItem("kanakku:last-active", String(Date.now() - 20 * 60 * 1000));
});
await page.reload();

await page.waitForSelector("text=Locked after inactivity", { timeout: 5000 });
check("reappears locked after simulated 20-minute gap", true);

const navVisible = await page.locator("nav[aria-label='Primary']").count();
check("nav/content hidden while locked", navVisible === 0);

// Wrong password should not unlock.
await page.fill("#lock-password", "wrong-password");
await page.click('button:has-text("Unlock")');
await page.waitForSelector("text=That password isn't right.", { timeout: 5000 });
check("wrong password rejected", true);

// Correct password unlocks.
await page.fill("#lock-password", "kanakku-owner");
await page.click('button:has-text("Unlock")');
await page.waitForSelector("text=Safe to spend", { timeout: 5000 });
check("correct password unlocks and shows content again", true);

// Reload right after unlocking: should stay unlocked (activity was just recorded).
await page.reload();
await page.waitForSelector("text=Safe to spend", { timeout: 5000 });
locked = await page.locator("text=Locked after inactivity").count();
check("stays unlocked on reload shortly after unlocking", locked === 0);

await browser.close();
