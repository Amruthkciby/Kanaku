// One-off Playwright smoke test for milestone 11 (offline queue for the family Add flow).

import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("requestfinished", async (req) => {
  if (req.url().includes("household-entries")) {
    const res = await req.response();
    console.log("household-entries request:", req.method(), "->", res?.status(), await res?.text().catch(() => ""));
  }
});
page.on("requestfailed", (req) => {
  if (req.url().includes("household-entries")) console.log("household-entries FAILED:", req.failure()?.errorText);
});

function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) process.exitCode = 1;
}

await page.goto(`${BASE}/login`);
await page.fill("#email", "me@kanakku.local");
await page.fill("#password", "kanakku-member");
await page.click('button[type="submit"]');
await page.waitForURL("**/family");

await page.goto(`${BASE}/add`);
await page.waitForSelector("#amount");

// Go offline, then submit an entry.
await context.setOffline(true);
await page.fill("#amount", "321");
await page.click('button:has-text("Fuel")');
await page.click('button:has-text("Save entry")');

await page.waitForSelector("text=Saved offline", { timeout: 5000 });
check("offline submit shows 'Saved offline' confirmation", true);

await page.waitForSelector("text=entry saved offline", { timeout: 5000 });
check("offline queue indicator banner appears", true);

const queueBefore = await page.evaluate(() => localStorage.getItem("kanakku:offline-queue:v1"));
console.log("queue before going back online:", queueBefore);

// Back online: the indicator should auto-flush and disappear.
await context.setOffline(false);
console.log("navigator.onLine after setOffline(false):", await page.evaluate(() => navigator.onLine));
await page.waitForTimeout(500);
console.log("dispatching synthetic online event as a fallback trigger");
await page.evaluate(() => window.dispatchEvent(new Event("online")));
await page.waitForSelector("text=entry saved offline", { state: "detached", timeout: 10000 });
check("queue indicator clears after reconnecting", true);

await browser.close();
