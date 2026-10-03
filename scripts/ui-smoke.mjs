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
  await page.evaluate(() => document.fonts.ready);
});

await step("створення запису (5 год)", async () => {
  await page.click('button[aria-label="Створити"]');
  await page.waitForSelector("text=Оберіть клієнта");
  await page.click("text=Марко Россі");
  await page.waitForSelector("text=Ставка");
  await page.getByRole('button', { name: 'Змінити години' }).click();
  await page.waitForTimeout(150); // Dialog initialization positions the wheels first.
  const hoursWheel = page.locator('[role="dialog"] .scrollbar-hide').first();
  await hoursWheel.evaluate((el) => { el.scrollTop = 5 * 48; });
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Підтвердити', exact: true }).click();
  await page.click('button:has-text("Створити запис")');
  await page.waitForSelector("text=Запис створено", { timeout: 5000 });
});

await step("зміна статусу після підтвердження збереження", async () => {
  await page.waitForURL(BASE + "/");
  const statusBtn = page.locator('button[aria-label="Статус"]').first();
  await statusBtn.click();
  await page.click('[role="menuitem"]:has-text("Оплачено")');
  await page.waitForTimeout(400); // відповідь демо-бекенда
});

await step("деталі дня: кнопка видалення не перекрита доком", async () => {
  await page.locator('[data-day-card]').first().getByRole('button').nth(1).click();
  await page.waitForSelector('button:has-text("Видалити запис")');
  const btn = page.locator('button:has-text("Видалити запис")');
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
  await btn.scrollIntoViewIfNeeded();
  const box = await btn.boundingBox();
  const hit = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest("button")?.textContent?.trim() ?? "none";
  }, [box.x + box.width / 2, box.y + box.height / 2]);
  if (!hit.includes("Видалити")) throw new Error(`перекрито: ${hit}`);
});

await step("часткова оплата з копійками", async () => {
  await page.getByRole('button', { name: 'Не оплачено', exact: true }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Частково', exact: true }).click();
  await page.getByLabel('Отримано, €').fill('1.25');
  await page.getByRole('button', { name: 'Додати', exact: true }).click();
  await page.waitForSelector('text=Оплату додано');
  await page.waitForSelector('main number-flow-react[aria-label="1,25"]');
});

await step("швидке збереження нотатки перед навігацією", async () => {
  const dayUrl = page.url();
  await page.getByLabel('Нотатка').fill('Smoke: зберегти перед переходом');
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.waitForURL(BASE + '/');
  await page.locator('[data-day-card]').filter({ hasText: 'Smoke: зберегти перед переходом' }).getByRole('button').nth(1).click();
  await page.waitForURL(dayUrl);
  await page.waitForSelector('textarea');
  if (await page.locator('textarea').inputValue() !== 'Smoke: зберегти перед переходом') throw new Error('Нотатку втрачено');
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
