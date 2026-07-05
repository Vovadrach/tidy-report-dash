/**
 * UI smoke (Ясно 4.0). Потребує: dev-сервер із VITE_DEMO=1, системний Chrome,
 * playwright-core. BASE_URL/​CHROME_PATH — через env.
 *
 * Сценарії: стрічка → QuickAdd (створити запис) → DaySheet → Гроші →
 * Картка клієнта. + перевірка відсутності помилок сторінки.
 */
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:8080";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 402, height: 850 },
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

await step("стрічка відкривається", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('button[aria-label="Додати запис"]', { timeout: 10_000 });
});

await step("QuickAdd: створення запису", async () => {
  await page.click('button[aria-label="Додати запис"]');
  await page.waitForSelector("text=Новий запис");
  await page.selectOption("select", { index: 1 });
  for (let i = 0; i < 12; i++) await page.click('button[aria-label="Більше на 15 хв"]');
  await page.click('button:has-text("Зберегти")');
  await page.waitForSelector("text=Запис додано", { timeout: 5000 });
});

await step("DaySheet відкривається з рядка", async () => {
  await page.locator(".row").first().click();
  await page.waitForSelector("text=Видалити запис", { timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
});

await step("Гроші: борги і огляд", async () => {
  await page.click('a[href="/money"]');
  await page.waitForSelector("text=Тобі винні", { timeout: 5000 });
  await page.click('[role="tab"]:has-text("Огляд")');
  await page.waitForSelector("text=Зароблено", { timeout: 5000 });
});

await step("Картка клієнта: історія", async () => {
  await page.goto(BASE + "/clients", { waitUntil: "networkidle" });
  await page.locator(".row").first().click();
  await page.waitForSelector('button:has-text("Записати роботу")', { timeout: 5000 });
});

if (errors.length) {
  console.error("Помилки сторінки:", errors);
  process.exitCode = 1;
}

await browser.close();
console.log(process.exitCode ? "SMOKE FAILED" : "SMOKE OK");
