/**
 * Puppeteer Smoke Test — Verifica il funzionamento di Puppeteer
 *
 * Test di base:
 *   - Avvio del browser (headless)
 *   - Navigazione verso l'app PDFhandler
 *   - Screenshot della pagina
 *   - Verifica contenuto e titolo
 *   - Intercettazione richieste di rete
 *   - Valutazione JavaScript nel contesto della pagina
 *
 * Esegui con: node tests/puppeteer-smoke.mjs
 */

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import { fileURLToPath } from 'url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(PROJECT_ROOT, 'test-results', 'puppeteer-smoke');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

async function run() {
  console.log('\n🧪 Puppeteer Smoke Test\n' + '─'.repeat(50));

  // ─── Test 1: Avvio Browser ────────────────────────────────────
  console.log('\n📋 Test 1: Avvio browser headless');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    assert(browser !== null, 'Browser avviato correttamente');
    assert(typeof browser.version === 'function', 'Metodo browser.version() disponibile');

    const version = await browser.version();
    console.log(`  ℹ️  Versione browser: ${version}`);
  } catch (err) {
    console.error(`  ❌ Errore avvio browser: ${err.message}`);
    failed++;
    process.exit(1);
  }

  // ─── Test 2: Nuova Pagina ─────────────────────────────────────
  console.log('\n📋 Test 2: Creazione nuova pagina');
  let page;
  try {
    page = await browser.newPage();
    assert(page !== null, 'Pagina creata correttamente');
    assert(typeof page.goto === 'function', 'Metodo page.goto() disponibile');
  } catch (err) {
    console.error(`  ❌ Errore creazione pagina: ${err.message}`);
    failed++;
    await browser.close();
    process.exit(1);
  }

  // ─── Test 3: Navigazione ──────────────────────────────────────
  console.log(`\n📋 Test 3: Navigazione verso ${BASE_URL}`);
  let response;
  try {
    response = await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15_000 });
    assert(response !== null, 'Risposta HTTP ricevuta');
    assert(response.ok() || response.status() === 304, `Status HTTP OK (${response.status()})`);
    assert(response.status() === 200 || response.status() === 304, `Status 200 o 304 (ottenuto ${response.status()})`);
  } catch (err) {
    console.error(`  ❌ Errore navigazione: ${err.message}`);
    console.error('  ⚠️  Assicurati che il server sia avviato: npm run dev');
    failed++;
    await browser.close();
    process.exit(1);
  }

  // ─── Test 4: Titolo e Contenuto ───────────────────────────────
  console.log('\n📋 Test 4: Contenuto della pagina');
  try {
    const title = await page.title();
    assert(title.length > 0, `Titolo presente: "${title}"`);

    const bodyText = await page.$eval('body', (el) => el.innerText);
    assert(bodyText.length > 20, `Contenuto body > 20 caratteri (${bodyText.length})`);

    const header = await page.$('header');
    assert(header !== null, 'Elemento <header> trovato');
  } catch (err) {
    console.error(`  ❌ Errore verifica contenuto: ${err.message}`);
    failed++;
  }

  // ─── Test 5: Screenshot ───────────────────────────────────────
  console.log('\n📋 Test 5: Screenshot');
  try {
    await page.setViewport({ width: 1280, height: 720 });
    const screenshotPath = path.join(SCREENSHOT_DIR, 'homepage.png');

    const fsMod = fs;
    fsMod.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.screenshot({ path: screenshotPath, fullPage: false });
    assert(fsMod.existsSync(screenshotPath), `Screenshot salvato: ${screenshotPath}`);
  } catch (err) {
    console.error(`  ❌ Errore screenshot: ${err.message}`);
    failed++;
  }

  // ─── Test 6: Intercettazione Richieste ────────────────────────
  console.log('\n📋 Test 6: Intercettazione richieste di rete');
  try {
    const requests = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'document' || req.resourceType() === 'script') {
        requests.push({ url: req.url(), type: req.resourceType() });
      }
    });

    await page.reload({ waitUntil: 'networkidle0', timeout: 15_000 });
    assert(requests.length > 0, `Richieste intercettate: ${requests.length}`);

    const hasMainDoc = requests.some((r) => r.type === 'document');
    assert(hasMainDoc, 'Richiesta document principale intercettata');
  } catch (err) {
    console.error(`  ❌ Errore intercettazione: ${err.message}`);
    failed++;
  }

  // ─── Test 7: Valutazione JS ───────────────────────────────────
  console.log('\n📋 Test 7: Valutazione JavaScript nella pagina');
  try {
    const userAgent = await page.evaluate(() => navigator.userAgent);
    assert(userAgent.includes('HeadlessChrome'), `User agent contiene HeadlessChrome: ${userAgent.substring(0, 60)}...`);

    const readyState = await page.evaluate(() => document.readyState);
    assert(readyState === 'complete', `document.readyState = "${readyState}"`);

    const windowProps = await page.evaluate(() => Object.keys(window).length);
    assert(windowProps > 0, `window ha ${windowProps} proprietà`);
  } catch (err) {
    console.error(`  ❌ Errore valutazione JS: ${err.message}`);
    failed++;
  }

  // ─── Test 8: Cookie e Storage ─────────────────────────────────
  console.log('\n📋 Test 8: Cookie e LocalStorage');
  try {
    await page.evaluate(() => {
      localStorage.setItem('test_key', 'test_value');
    });
    const value = await page.evaluate(() => localStorage.getItem('test_key'));
    assert(value === 'test_value', `localStorage funzionante: "${value}"`);

    const cookies = await page.cookies();
    assert(Array.isArray(cookies), `page.cookies() restituisce array (${cookies.length} cookies)`);
  } catch (err) {
    console.error(`  ❌ Errore storage: ${err.message}`);
    failed++;
  }

  // ─── Cleanup ──────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  await browser.close();
  console.log('Browser chiuso.');

  // ─── Summary ──────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n📊 Riepilogo: ${passed}/${total} test passati`);
  if (failed > 0) {
    console.error(`❌ ${failed} test falliti`);
    process.exit(1);
  } else {
    console.log('✅ Tutti i test Puppeteer sono passati!\n');
  }
}

run().catch((err) => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
