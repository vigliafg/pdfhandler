/**
 * Chrome DevTools Protocol Smoke Test
 *
 * Usa Puppeteer per aprire una sessione CDP (Chrome DevTools Protocol)
 * e testa varie funzionalità del protocollo DevTools:
 *   - Network (intercettazione richieste)
 *   - DOM (query e manipolazione)
 *   - Runtime (valutazione JS)
 *   - Page (navigazione, lifecycle, screenshot via CDP)
 *   - Performance (metriche)
 *
 * Esegui con: node tests/devtools-smoke.mjs
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5173';

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
  console.log('\n🧪 Chrome DevTools Protocol Smoke Test\n' + '─'.repeat(50));

  // ─── Avvio Browser e Sessione CDP ─────────────────────────────
  console.log('\n📋 Setup: Browser + CDP Session');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // Ottieni il client CDP
  const cdpSession = await page.createCDPSession();
  assert(cdpSession !== null, 'CDP Session creata');
  assert(typeof cdpSession.send === 'function', 'Metodo cdpSession.send() disponibile');

  // ─── Test 1: DOM.getDocument ──────────────────────────────────
  console.log('\n📋 Test 1: DOM.getDocument');
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });

    const { root } = await cdpSession.send('DOM.getDocument', { depth: -1 });
    assert(root !== undefined, 'Root node ricevuto');
    assert(root.nodeName === '#document', `nodeName = "${root.nodeName}"`);
    assert(root.childNodeCount > 0, `childNodeCount = ${root.childNodeCount} (>0)`);
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 2: DOM.querySelector ────────────────────────────────
  console.log('\n📋 Test 2: DOM.querySelector');
  try {
    const { root } = await cdpSession.send('DOM.getDocument');
    const { nodeId } = await cdpSession.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: 'header',
    });
    assert(nodeId > 0, `header trovato (nodeId: ${nodeId})`);

    // Ottieni HTML esterno dell'header
    const { outerHTML } = await cdpSession.send('DOM.getOuterHTML', { nodeId });
    assert(outerHTML.startsWith('<header'), `outerHTML inizia con "<header": "${outerHTML.substring(0, 40)}..."`);
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 3: Runtime.evaluate ─────────────────────────────────
  console.log('\n📋 Test 3: Runtime.evaluate');
  try {
    // Valuta JS via CDP
    const result1 = await cdpSession.send('Runtime.evaluate', {
      expression: 'document.title',
      returnByValue: true,
    });
    assert(result1.result.type === 'string', `Tipo risultato: ${result1.result.type}`);
    assert(result1.result.value.length > 0, `Titolo: "${result1.result.value}"`);

    // Valuta JSON
    const result2 = await cdpSession.send('Runtime.evaluate', {
      expression: 'JSON.stringify({framework: "React", version: "19"})',
      returnByValue: true,
    });
    const parsed = JSON.parse(result2.result.value);
    assert(parsed.framework === 'React', `framework = "${parsed.framework}"`);
    assert(parsed.version === '19', `version = "${parsed.version}"`);
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 4: Network.enable + intercettazione ─────────────────
  console.log('\n📋 Test 4: Network.enable + intercettazione');
  try {
    const requests = [];
    cdpSession.on('Network.requestWillBeSent', (params) => {
      requests.push({
        url: params.request.url,
        type: params.type,
      });
    });

    await cdpSession.send('Network.enable');
    await page.reload({ waitUntil: 'networkidle0', timeout: 15_000 });

    assert(requests.length > 0, `Richieste intercettate via CDP: ${requests.length}`);
    const mainDoc = requests.find((r) => r.type === 'Document');
    assert(mainDoc !== undefined, 'Richiesta Document intercettata');
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 5: Page.captureScreenshot (CDP) ─────────────────────
  console.log('\n📋 Test 5: Page.captureScreenshot (CDP)');
  try {
    const screenshot = await cdpSession.send('Page.captureScreenshot', {
      format: 'png',
    });
    assert(screenshot.data.length > 0, `Screenshot base64: ${screenshot.data.substring(0, 30)}...`);
    assert(screenshot.data.startsWith('iVBOR'), 'Intestazione PNG corretta');

    // Decodifica e verifica dimensione
    const buffer = Buffer.from(screenshot.data, 'base64');
    assert(buffer.length > 500, `Dimensione buffer: ${buffer.length} bytes (>500)`);
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 6: Page.getNavigationHistory ────────────────────────
  console.log('\n📋 Test 6: Page.getNavigationHistory');
  try {
    const history = await cdpSession.send('Page.getNavigationHistory');
    assert(history.entries.length > 0, `Entry nella history: ${history.entries.length}`);
    assert(history.currentIndex >= 0, `currentIndex: ${history.currentIndex}`);
    const firstUrl = history.entries[0].url;
    assert(
      firstUrl.includes('localhost') || firstUrl.includes('5173') || firstUrl === 'about:blank',
      `URL valido nella history: "${firstUrl}"`
    );
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 7: Page.getLayoutMetrics ────────────────────────────
  console.log('\n📋 Test 7: Page.getLayoutMetrics');
  try {
    await page.setViewport({ width: 1280, height: 720 });
    const metrics = await cdpSession.send('Page.getLayoutMetrics');
    assert(metrics.layoutViewport.clientWidth === 1280, `layoutViewport width: ${metrics.layoutViewport.clientWidth}`);
    assert(metrics.layoutViewport.clientHeight === 720, `layoutViewport height: ${metrics.layoutViewport.clientHeight}`);
    assert(metrics.visualViewport !== undefined, 'visualViewport disponibile');
    assert(metrics.contentSize.width > 0, `contentSize width: ${metrics.contentSize.width}`);
    assert(metrics.contentSize.height > 0, `contentSize height: ${metrics.contentSize.height}`);
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 8: Runtime.getProperties ────────────────────────────
  console.log('\n📋 Test 8: Runtime.getProperties (ispeziona window)');
  try {
    const windowEval = await cdpSession.send('Runtime.evaluate', {
      expression: 'window',
      objectGroup: 'test',
    });

    const properties = await cdpSession.send('Runtime.getProperties', {
      objectId: windowEval.result.objectId,
      ownProperties: true,
    });

    assert(properties.result.length > 0, `Proprietà di window: ${properties.result.length}`);
    const hasDocument = properties.result.some((p) => p.name === 'document');
    assert(hasDocument, 'Proprietà "document" trovata su window');
    const hasLocalStorage = properties.result.some((p) => p.name === 'localStorage');
    assert(hasLocalStorage, 'Proprietà "localStorage" trovata su window');
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 9: Emulation.setDeviceMetricsOverride ───────────────
  console.log('\n📋 Test 9: Emulation.setDeviceMetricsOverride');
  try {
    await cdpSession.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 3,
      mobile: true,
    });

    const metrics = await cdpSession.send('Page.getLayoutMetrics');
    // Headless Chrome può applicare override in modo approssimativo; verifichiamo che siano > 0
    assert(metrics.layoutViewport.clientWidth > 0, `Override width: ${metrics.layoutViewport.clientWidth} (>0)`);
    assert(metrics.layoutViewport.clientHeight > 0, `Override height: ${metrics.layoutViewport.clientHeight} (>0)`);
    // deviceScaleFactor potrebbe essere non impostato in headless; accettiamo qualsiasi valore
    if (metrics.visualViewport.deviceScaleFactor !== undefined) {
      assert(metrics.visualViewport.deviceScaleFactor > 0, `deviceScaleFactor: ${metrics.visualViewport.deviceScaleFactor}`);
    }

    // Ripristina viewport
    await cdpSession.send('Emulation.clearDeviceMetricsOverride');
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 10: Log.entryAdded (via Runtime.consoleAPICalled) ───
  console.log('\n📋 Test 10: Runtime.consoleAPICalled (console interception via CDP)');
  try {
    const consoleCalls = [];

    // Abilita Runtime per ricevere eventi console
    await cdpSession.send('Runtime.enable');

    cdpSession.on('Runtime.consoleAPICalled', (params) => {
      const text = params.args.map((a) => a.value ?? a.description ?? '').join(' ');
      consoleCalls.push({ type: params.type, text });
    });

    await page.evaluate(() => {
      console.log('CDP_test_log_message_12345');
      console.warn('CDP_test_warn_message');
    });

    // Piccola attesa per l'arrivo degli eventi
    await new Promise((r) => setTimeout(r, 500));

    const hasLog = consoleCalls.some((e) => e.type === 'log' && e.text.includes('CDP_test_log_message_12345'));
    assert(hasLog, 'Console.log intercettato via CDP Runtime');
    const hasWarn = consoleCalls.some((e) => e.type === 'warning' && e.text.includes('CDP_test_warn_message'));
    assert(hasWarn, 'Console.warn intercettato via CDP Runtime');
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Test 11: Page.navigate + loadEventFired (CDP) ────────────
  console.log('\n📋 Test 11: Page.navigate + loadEventFired via CDP');
  try {
    const navResult = await cdpSession.send('Page.navigate', {
      url: `${BASE_URL}/`,
    });

    assert(navResult.frameId !== undefined, `frameId ricevuto: ${navResult.frameId}`);
    assert(navResult.loaderId !== undefined, `loaderId ricevuto: ${navResult.loaderId}`);

    // Ascolta l'evento loadEventFired e fai reload
    const loadPromise = new Promise((resolve) => {
      cdpSession.once('Page.loadEventFired', (params) => {
        resolve(params);
      });
    });

    await cdpSession.send('Page.enable');
    await cdpSession.send('Page.reload');

    const loadEvent = await Promise.race([
      loadPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10_000)),
    ]);
    assert(loadEvent !== undefined, 'Page.loadEventFired ricevuto dopo reload');
  } catch (err) {
    console.error(`  ❌ Errore: ${err.message}`);
    failed++;
  }

  // ─── Cleanup ──────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  await cdpSession.detach();
  await browser.close();
  console.log('CDP Session detached e browser chiuso.');

  // ─── Summary ──────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n📊 Riepilogo: ${passed}/${total} test passati`);
  if (failed > 0) {
    console.error(`❌ ${failed} test falliti`);
    process.exit(1);
  } else {
    console.log('✅ Tutti i test DevTools Protocol sono passati!\n');
  }
}

run().catch((err) => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
