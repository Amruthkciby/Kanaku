import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${BASE}/login`);
await page.fill("#email", "father@kanakku.local");
await page.fill("#password", "kanakku-owner");
await page.click('button[type="submit"]');
await page.waitForURL("**/family");

const PAGES = ["/family", "/add", "/business", "/business/staff", "/more"];
const WIDTHS = [360, 390, 768, 1024, 1440];

for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 800 });
  for (const path of PAGES) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const iw = window.innerWidth;
      let culprit = null;
      if (sw > iw) {
        let worst = null;
        let worstOverflow = 0;
        document.querySelectorAll("body *").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > iw + 1) {
            const overflow = r.right - iw;
            if (overflow > worstOverflow) {
              worstOverflow = overflow;
              worst = el;
            }
          }
        });
        if (worst) {
          culprit = {
            tag: worst.tagName,
            cls: worst.className?.toString().slice(0, 120),
            text: worst.textContent?.slice(0, 60),
            overflowPx: Math.round(worstOverflow),
          };
        }
      }
      return { scrollWidth: sw, innerWidth: iw, overflowing: sw > iw, culprit };
    });
    if (info.overflowing) {
      console.log(`width=${width} ${path}: OVERFLOW scrollWidth=${info.scrollWidth} (+${info.scrollWidth - width}px)`, info.culprit);
    }
  }
}

await browser.close();
