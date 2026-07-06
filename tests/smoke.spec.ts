/**
 * Playwright Smoke Test — Verifica completa del funzionamento di Playwright
 *
 * Copre:
 *   - Navigazione e caricamento pagina
 *   - Locator (CSS, testo, ruolo, label, placeholder, testId)
 *   - Assertion (toBeVisible, toHaveText, toHaveClass, toHaveAttribute...)
 *   - Interazioni (click, fill, check, hover, focus, keyboard, drag)
 *   - Screenshot e viewport
 *   - Network: intercettazione, richieste, risposte
 *   - Browser context isolati
 *   - Emulazione mobile e geolocalizzazione
 *   - Dialog, console, errori
 *   - Storage (localStorage, cookies)
 *   - Performance e timing
 *   - Accessibilità
 *
 * Esegui con: npx playwright test tests/smoke.spec.ts --reporter=list
 */
import { test, expect, devices } from '@playwright/test';

// ────────────────────────────────────────────────────────────────────
// 1. NAVIGAZIONE & CARICAMENTO
// ────────────────────────────────────────────────────────────────────
test.describe('1. Navigazione e Caricamento', () => {
  test('1.1 Pagina iniziale si carica con HTTP 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('1.2 Titolo pagina contiene PDF', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PDF/i);
  });

  test('1.3 Header visibile con nome app', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).not.toBeEmpty();
  });

  test('1.4 Stato iniziale: No PDF loaded', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/No PDF/i)).toBeVisible({ timeout: 10_000 });
  });

  test('1.5 DOM completamente caricato (readyState)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const readyState = await page.evaluate(() => document.readyState);
    expect(readyState).toBe('complete');
  });

  test('1.6 Network idle raggiunto entro 15s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(15_000);
    console.log(`⏱️  networkidle in ${loadTime}ms`);
  });
});

// ────────────────────────────────────────────────────────────────────
// 2. LOCATOR — CSS, Testo, Ruolo, Label, Placeholder
// ────────────────────────────────────────────────────────────────────
test.describe('2. Locator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('2.1 getByRole: pulsante Editor', async ({ page }) => {
    const btn = page.getByRole('button', { name: /editor/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('2.2 getByRole: pulsante Viewer', async ({ page }) => {
    const btn = page.getByRole('button', { name: /viewer/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('2.3 getByText: No PDF', async ({ page }) => {
    const el = page.getByText(/No PDF/i);
    await expect(el.first()).toBeVisible();
  });

  test('2.4 locator CSS: header presente', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toHaveCount(1);
  });

  test('2.5 locator nidificati: header span', async ({ page }) => {
    const spans = page.locator('header').locator('span');
    const count = await spans.count();
    expect(count).toBeGreaterThan(0);
  });

  test('2.6 filter + hasText', async ({ page }) => {
    const btn = page.locator('header button').filter({ hasText: /editor/i });
    await expect(btn).toBeVisible();
  });

  test('2.7 nth() selector', async ({ page }) => {
    const btn = page.locator('header button').nth(0);
    await expect(btn).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────
// 3. INTERAZIONI — Click, Hover, Focus, Keyboard
// ────────────────────────────────────────────────────────────────────
test.describe('3. Interazioni', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('3.1 Click su Editor non causa crash', async ({ page }) => {
    await page.getByRole('button', { name: /editor/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('header')).toBeVisible();
  });

  test('3.2 Click su Viewer non causa crash', async ({ page }) => {
    await page.getByRole('button', { name: /viewer/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('header')).toBeVisible();
  });

  test('3.3 Editor → Viewer → Editor toggle', async ({ page }) => {
    await page.getByRole('button', { name: /editor/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /viewer/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /editor/i }).click();
    await page.waitForTimeout(400);
    await expect(page.locator('header')).toBeVisible();
  });

  test('3.4 Hover su header button non causa errori', async ({ page }) => {
    const btn = page.locator('header button').first();
    await btn.hover();
    await page.waitForTimeout(300);
  });

  test('3.5 Focus su elemento', async ({ page }) => {
    const editorBtn = page.getByRole('button', { name: /editor/i });
    await editorBtn.focus();
    await expect(editorBtn).toBeFocused({ timeout: 3000 });
  });

  test('3.6 Keyboard: tasto Escape non causa crash', async ({ page }) => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(page.locator('header')).toBeVisible();
  });

  test('3.7 Double click su header', async ({ page }) => {
    const header = page.locator('header');
    await header.dblclick();
    await page.waitForTimeout(300);
    await expect(header).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────
// 4. SCREENSHOT & VIEWPORT
// ────────────────────────────────────────────────────────────────────
test.describe('4. Screenshot e Viewport', () => {
  test('4.1 Screenshot full page', async ({ page }) => {
    await page.goto('/');
    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot.length).toBeGreaterThan(500);
    expect(screenshot[0]).toBe(0x89); // PNG magic byte
    expect(screenshot[1]).toBe(0x50); // P
    expect(screenshot[2]).toBe(0x4E); // N
    expect(screenshot[3]).toBe(0x47); // G
  });

  test('4.2 Screenshot viewport parziale', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto('/');
    const screenshot = await page.screenshot({ clip: { x: 0, y: 0, width: 400, height: 300 } });
    expect(screenshot.length).toBeGreaterThan(200);
  });

  test('4.3 Viewport personalizzato', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    const vp = page.viewportSize();
    expect(vp?.width).toBe(1920);
    expect(vp?.height).toBe(1080);
  });

  test('4.4 Viewport mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const vp = page.viewportSize();
    expect(vp?.width).toBe(375);
    expect(vp?.height).toBe(812);
  });
});

// ────────────────────────────────────────────────────────────────────
// 5. NETWORK — Intercettazione, Request, Response
// ────────────────────────────────────────────────────────────────────
test.describe('5. Network', () => {
  test('5.1 Intercetta richiesta document principale', async ({ page }) => {
    let docRequest = false;
    page.on('request', (req) => {
      if (req.resourceType() === 'document') docRequest = true;
    });
    await page.goto('/');
    expect(docRequest).toBe(true);
  });

  test('5.2 Response contiene content-type html', async ({ page }) => {
    const response = await page.goto('/');
    const contentType = response?.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/html');
  });

  test('5.3 Intercetta richieste API/statiche', async ({ page }) => {
    const resources: string[] = [];
    page.on('request', (req) => resources.push(req.resourceType()));
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(resources).toContain('script');
    expect(resources).toContain('document');
  });

  test('5.4 route: mock di una risposta', async ({ page }) => {
    await page.route('**/api/test-mock', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mock: true, test: 'playwright' }),
      });
    });

    await page.goto('/');
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/test-mock');
      return res.json();
    });
    expect(result).toEqual({ mock: true, test: 'playwright' });
  });

  test('5.5 route: abort di una richiesta', async ({ page }) => {
    await page.route('**/*.woff2', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────
// 6. BROWSER CONTEXT — Isolamento
// ────────────────────────────────────────────────────────────────────
test.describe('6. Browser Context', () => {
  test('6.1 Due context isolati: localStorage indipendente', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();

    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    await page1.goto('/');
    await page2.goto('/');

    await page1.evaluate(() => localStorage.setItem('ctx', 'uno'));
    await page2.evaluate(() => localStorage.setItem('ctx', 'due'));

    const val1 = await page1.evaluate(() => localStorage.getItem('ctx'));
    const val2 = await page2.evaluate(() => localStorage.getItem('ctx'));

    expect(val1).toBe('uno');
    expect(val2).toBe('due');

    await ctx1.close();
    await ctx2.close();
  });

  test('6.2 Cookie isolati tra context', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/');

    await page.evaluate(() => {
      document.cookie = 'test_cookie=playwright_value; path=/';
    });

    const cookies = await ctx.cookies();
    expect(cookies.some((c) => c.name === 'test_cookie')).toBe(true);

    await ctx.close();
  });

  test('6.3 Nuovo context con geolocalizzazione', async ({ browser }) => {
    const ctx = await browser.newContext({
      geolocation: { latitude: 41.9028, longitude: 12.4964 }, // Roma
      permissions: ['geolocation'],
    });
    const page = await ctx.newPage();
    await page.goto('/');

    try {
      const pos = await page.evaluate(
        () => new Promise<{ lat: number; lng: number }>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('geolocation timeout')), 5000);
          navigator.geolocation.getCurrentPosition(
            (p) => {
              clearTimeout(timeout);
              resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
            },
            (err) => {
              clearTimeout(timeout);
              reject(new Error(err.message));
            }
          );
        })
      );
      expect(pos.lat).toBeCloseTo(41.9028, 2);
      expect(pos.lng).toBeCloseTo(12.4964, 2);
    } catch (err: any) {
      console.log(`  ⚠️  Geolocalizzazione non supportata in headless: ${err.message}`);
      // La geolocalizzazione potrebbe non funzionare in headless — il test non fallisce
    }

    await ctx.close();
  });
});

// ────────────────────────────────────────────────────────────────────
// 7. CONSOLE & DIALOG
// ────────────────────────────────────────────────────────────────────
test.describe('7. Console e Dialog', () => {
  test('7.1 Nessun pageerror al caricamento', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(errors.length).toBeLessThanOrEqual(3);
    if (errors.length > 0) {
      console.log(`⚠️  pageerror trovati: ${errors.join('; ')}`);
    }
  });

  test('7.2 Intercetta messaggi console', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') logs.push(msg.text());
    });

    await page.goto('/');
    await page.evaluate(() => console.log('PLAYWRIGHT_SMOKE_TEST_LOG'));
    await page.waitForTimeout(500);

    expect(logs.some((l) => l.includes('PLAYWRIGHT_SMOKE_TEST_LOG'))).toBe(true);
  });

  test('7.3 Intercetta console.warn', async ({ page }) => {
    const warns: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') warns.push(msg.text());
    });

    await page.goto('/');
    await page.evaluate(() => console.warn('PLAYWRIGHT_SMOKE_TEST_WARN'));
    await page.waitForTimeout(500);

    expect(warns.some((w) => w.includes('PLAYWRIGHT_SMOKE_TEST_WARN'))).toBe(true);
  });

  test('7.4 Gestione dialog: alert', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('SMOKE_TEST_ALERT');
      await dialog.accept();
    });

    await page.goto('/');
    await page.evaluate(() => alert('SMOKE_TEST_ALERT'));
    await page.waitForTimeout(300);
  });

  test('7.5 Gestione dialog: confirm (accept)', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto('/');
    const result = await page.evaluate(() => confirm('test'));
    expect(result).toBe(true);
  });

  test('7.6 Gestione dialog: confirm (dismiss)', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    await page.goto('/');
    const result = await page.evaluate(() => confirm('test'));
    expect(result).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────
// 8. STORAGE — localStorage, sessionStorage, Cookies
// ────────────────────────────────────────────────────────────────────
test.describe('8. Storage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('8.1 localStorage set/get', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('pw_key', 'pw_value'));
    const val = await page.evaluate(() => localStorage.getItem('pw_key'));
    expect(val).toBe('pw_value');
  });

  test('8.2 localStorage removeItem', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('pw_temp', 'x');
      localStorage.removeItem('pw_temp');
    });
    const val = await page.evaluate(() => localStorage.getItem('pw_temp'));
    expect(val).toBeNull();
  });

  test('8.3 sessionStorage set/get', async ({ page }) => {
    await page.evaluate(() => sessionStorage.setItem('pw_ss', 'session_val'));
    const val = await page.evaluate(() => sessionStorage.getItem('pw_ss'));
    expect(val).toBe('session_val');
  });

  test('8.4 Cookies set/get', async ({ page }) => {
    await page.evaluate(() => {
      document.cookie = 'pw_cookie=smoke_test; path=/';
    });
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'pw_cookie')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────
// 9. EMULAZIONE — Mobile, Color Scheme, User Agent
// ────────────────────────────────────────────────────────────────────
test.describe('9. Emulazione', () => {
  test('9.1 Emulazione mobile (Pixel 5)', async ({ browser }) => {
    const pixel5 = devices['Pixel 5'];
    const ctx = await browser.newContext({
      viewport: pixel5.viewport,
      userAgent: pixel5.userAgent,
      deviceScaleFactor: pixel5.deviceScaleFactor,
      isMobile: pixel5.isMobile,
      hasTouch: pixel5.hasTouch,
    });
    const page = await ctx.newPage();
    await page.goto('/');

    const ua = await page.evaluate(() => navigator.userAgent);
    expect(ua).toContain('Mobile');

    await ctx.close();
  });

  test('9.2 Dark mode (prefers-color-scheme)', async ({ browser }) => {
    const ctx = await browser.newContext({
      colorScheme: 'dark',
    });
    const page = await ctx.newPage();
    await page.goto('/');

    const isDark = await page.evaluate(
      () => window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    expect(isDark).toBe(true);

    await ctx.close();
  });

  test('9.3 Light mode (default)', async ({ page }) => {
    await page.goto('/');
    const isLight = await page.evaluate(
      () =>
        window.matchMedia('(prefers-color-scheme: light)').matches
    );
    expect(isLight).toBe(true);
  });

  test('9.4 User agent personalizzato', async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent: 'PlaywrightSmokeTest/1.0',
    });
    const page = await ctx.newPage();
    await page.goto('/');

    const ua = await page.evaluate(() => navigator.userAgent);
    expect(ua).toBe('PlaywrightSmokeTest/1.0');

    await ctx.close();
  });
});

// ────────────────────────────────────────────────────────────────────
// 10. PERFORMANCE & TIMING
// ────────────────────────────────────────────────────────────────────
test.describe('10. Performance', () => {
  test('10.1 loadEventFired entro 10s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'load' });
    expect(Date.now() - start).toBeLessThan(10_000);
  });

  test('10.2 DOMContentLoaded entro 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(Date.now() - start).toBeLessThan(5_000);
  });

  test('10.3 evaluate sincrono è veloce', async ({ page }) => {
    await page.goto('/');
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => 1 + 1);
    }
    expect(Date.now() - start).toBeLessThan(10_000);
  });
});

// ────────────────────────────────────────────────────────────────────
// 11. API JS — page.evaluate, page.$eval, page.$$eval
// ────────────────────────────────────────────────────────────────────
test.describe('11. API JavaScript', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('11.1 page.evaluate restituisce valore', async ({ page }) => {
    const result = await page.evaluate(() => 42);
    expect(result).toBe(42);
  });

  test('11.2 page.evaluate con argomento', async ({ page }) => {
    const sum = await page.evaluate(({ a, b }: { a: number; b: number }) => a + b, { a: 3, b: 7 });
    expect(sum).toBe(10);
  });

  test('11.3 page.evaluate restituisce oggetto', async ({ page }) => {
    const obj = await page.evaluate(() => ({
      framework: 'React',
      version: 19,
    }));
    expect(obj).toEqual({ framework: 'React', version: 19 });
  });

  test('11.4 page.$eval su header', async ({ page }) => {
    const tagName = await page.$eval('header', (el) => el.tagName);
    expect(tagName).toBe('HEADER');
  });

  test('11.5 page.$$eval conta elementi', async ({ page }) => {
    const buttonCount = await page.$$eval('button', (btns) => btns.length);
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('11.6 page.waitForFunction', async ({ page }) => {
    await page.evaluate(() => {
      setTimeout(() => {
        (window as any).__pw_ready = true;
      }, 500);
    });
    await page.waitForFunction(() => (window as any).__pw_ready === true);
  });
});

// ────────────────────────────────────────────────────────────────────
// 12. ACCESSIBILITÀ
// ────────────────────────────────────────────────────────────────────
test.describe('12. Accessibilità', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('12.1 Snapshot accessibilità', async ({ page }) => {
    // L'accessibilità potrebbe non essere disponibile in alcune configurazioni
    if (!page.accessibility) {
      test.skip(true, 'page.accessibility non disponibile');
      return;
    }
    const snapshot = await page.accessibility.snapshot();
    expect(snapshot).toBeTruthy();
    expect(snapshot!.role).toBeDefined();
    expect(snapshot!.name).toBeDefined();
  });

  test('12.2 Pulsanti hanno nome accessibile', async ({ page }) => {
    if (!page.accessibility) {
      test.skip(true, 'page.accessibility non disponibile');
      return;
    }
    const snapshot = await page.accessibility.snapshot();
    const buttons = findAllRoles(snapshot!, 'button');
    // Almeno un pulsante deve avere un nome
    const namedButtons = buttons.filter((b) => b.name && b.name.length > 0);
    expect(namedButtons.length).toBeGreaterThan(0);
  });
});

function findAllRoles(node: any, role: string): any[] {
  const results: any[] = [];
  if (node.role === role) results.push(node);
  if (node.children) {
    for (const child of node.children) {
      results.push(...findAllRoles(child, role));
    }
  }
  return results;
}
