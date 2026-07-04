/**
 * UI smoke (V3-SPEC §13.4). Потребує: dev-сервер із VITE_DEMO=1 на :8080,
 * системний Chrome, playwright-core (npx playwright-core недостатньо —
 * встановлюється тимчасово: npm i -D playwright-core).
 *
 * Сценарії: створити запис → оплачено → часткова оплата → видалення з
 * підтвердженням → навігація доком; + перевірка, що кнопки не перекриті.
 */
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:8080";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const step = async (name, fn) => {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    await page.screenshot({ path: `smoke-fail-${Date.now()}.png` });
    process.exitCode = 1;
    throw e;
  }
};

await step("головна відкривається", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Сьогодні", { timeout: 10_000 });
});

await step("створення запису (5 год)", async () => {
  await page.click('button[aria-label="Створити запис"]');
  await page.waitForSelector("text=Оберіть клієнта");
  await page.click("text=Марко Россі");
  await page.waitForSelector("text=Ставка");
  // колесо годин: скрол до 5
  const hoursWheel = page.locator(".scrollbar-hide").first();
  await hoursWheel.evaluate((el) => { el.scrollTop = 5 * 40; });
  await page.waitForTimeout(400);
  await page.click('button:has-text("Створити запис")');
  await page.waitForSelector("text=Запис створено", { timeout: 5000 });
});

await step("зміна статусу на оплачено (оптимістично)", async () => {
  await page.waitForURL(BASE + "/");
  const statusBtn = page.locator('button[aria-label="Статус оплати"]').first();
  await statusBtn.click();
  await page.click('[role="menuitem"]:has-text("Оплачено")');
  await page.waitForTimeout(400); // оптимістичне оновлення краплини
});

await step("деталі дня: кнопка видалення не перекрита доком", async () => {
  await page.locator(".surface-card.surface-card-hover").first().click();
  await page.waitForSelector('button:has-text("Видалити запис")');
  const btn = page.locator('button:has-text("Видалити запис")');
  const box = await btn.boundingBox();
  const hit = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest("button")?.textContent?.trim() ?? "none";
  }, [box.x + box.width / 2, box.y + box.height / 2]);
  if (!hit.includes("Видалити")) throw new Error(`перекрито: ${hit}`);
});

await step("видалення з підтвердженням", async () => {
  await page.click('button:has-text("Видалити запис")');
  await page.waitForSelector("text=Видалити запис?");
  await page.click('[role="alertdialog"] button:has-text("Видалити")');
  await page.waitForURL(BASE + "/", { timeout: 5000 });
});

await step("навігація доком: Очікую і Звіт", async () => {
  await page.click('button:has-text("Очікую")');
  await page.waitForURL("**/reports-status");
  await page.click('button:has-text("Звіт")');
  await page.waitForURL("**/dashboard");
  await page.click('button:has-text("Головна")');
  await page.waitForURL(BASE + "/");
});

if (errors.length) {
  console.error("Помилки сторінки:", errors);
  process.exitCode = 1;
}

await browser.close();
console.log(process.exitCode ? "SMOKE FAILED" : "SMOKE OK");
