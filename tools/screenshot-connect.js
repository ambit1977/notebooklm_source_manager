// tools/screenshot-connect.js
// Puppeteer script to connect to an existing Chrome instance started with --remote-debugging-port
// Usage:
// 1) Start Chrome with a dedicated profile and remote debugging (see README for exact commands).
// 2) npm run screenshot:connect -- --browserURL=http://localhost:9222

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const argv = require('minimist')(process.argv.slice(2));
  const browserURL = argv.browserURL || argv.b || 'http://localhost:9222';
  const notebookUrl = argv.notebookUrl || argv.n || 'https://notebooklm.google.com/notebook/';
  const extPath = path.resolve(process.cwd(), 'dist');
  const outDir = path.resolve(process.cwd(), 'dist', 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Connecting to existing Chrome at', browserURL);
  const browser = await puppeteer.connect({ browserURL, defaultViewport: null });

  try {
    const pages = await browser.pages();
    let page = pages[0] || await browser.newPage();

    // Navigate to NotebookLM to ensure the profile is loaded
    console.log('Opening NotebookLM to confirm profile is active:', notebookUrl);
    await page.goto(notebookUrl, { waitUntil: 'networkidle2' });

    console.log('If NotebookLM requires sign-in, please sign in using the running Chrome instance before continuing.');
    console.log('Press ENTER here once ready...');
    await new Promise(resolve => process.stdin.once('data', resolve));

    // Inspect targets to discover extension id
    const targets = await browser.targets();
    let extensionId = null;
    for (const t of targets) {
      const url = t.url();
      if (url && url.startsWith('chrome-extension://')) {
        const m = url.match(/^chrome-extension:\/\/([^\/]+)\//);
        if (m) { extensionId = m[1]; break; }
      }
    }

    if (!extensionId) {
      console.warn('Could not determine extension id automatically. You may need to open the extension page manually in Chrome.');
    } else {
      console.log('Detected extension id:', extensionId);
    }

    async function captureFilter() {
      if (extensionId) {
        const extUrl = `chrome-extension://${extensionId}/filter.html`;
        console.log('Opening', extUrl);
        const p = await browser.newPage();
        await p.goto(extUrl, { waitUntil: 'networkidle2' });
        await p.waitForTimeout(500);
        await p.screenshot({ path: path.join(outDir, 'filter-window-connect.png'), fullPage: true });
        await p.close();
      } else {
        console.warn('No extension id; please open filter.html manually in the connected Chrome and then press ENTER.');
        await new Promise(resolve => process.stdin.once('data', resolve));
        const pages = await browser.pages();
        const active = pages[pages.length - 1];
        if (active) {
          await active.screenshot({ path: path.join(outDir, 'filter-window-manual-connect.png'), fullPage: true });
        } else {
          console.error('No active page to capture.');
        }
      }
    }

    await captureFilter();

    console.log('Screenshots saved to', outDir);
  } finally {
    try {
      // Do not close the browser here: we're connected to the user's running Chrome.
      await browser.disconnect();
    } catch (e) {
      // ignore
    }
  }

  console.log('Done. If you started Chrome with --remote-debugging-port, keep it running or close it manually.');
})();
