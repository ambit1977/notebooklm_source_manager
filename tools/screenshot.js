// tools/screenshot.js
// Puppeteer script to launch Chrome with the unpacked extension (dist) and capture screenshots of the extension popup and UI.
// Usage: npm run screenshot -- --notebookUrl="https://notebooklm.google.com/notebook/..." --profile=./tmp-profile

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const argv = require('minimist')(process.argv.slice(2));
  const notebookUrl = argv.notebookUrl || argv.n || 'https://notebooklm.google.com/notebook/';
  const profileDir = argv.profile || path.resolve(process.cwd(), 'tmp-profile');
  const extPath = path.resolve(process.cwd(), 'dist');
  const outDir = path.resolve(process.cwd(), 'dist', 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const userDataDir = profileDir;
  const execPath = argv.executablePath || argv.executable || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  console.log('Launching Chrome with extension from', extPath);
  console.log('Using Chrome executable:', execPath);
  const launchOptions = {
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check'
    ]
  };
  // If an executable path exists, prefer it
  if (execPath && fs.existsSync(execPath)) {
    launchOptions.executablePath = execPath;
  }
  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  await page.goto(notebookUrl, { waitUntil: 'networkidle2' });

  console.log('Please ensure you are logged in to NotebookLM in the launched browser.');
  console.log('Press ENTER here once you have logged in and the NotebookLM page is ready...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  // Find extension background target to obtain extension id
  const targets = await browser.targets();
  const extTarget = targets.find(t => t.type() === 'background_page' || t.type() === 'service_worker' );
  let extensionId = null;
  for (const t of targets) {
    const url = t.url();
    if (url && url.startsWith('chrome-extension://')) {
      const m = url.match(/^chrome-extension:\/\/([a-p0-9]+)\/"/i);
      // ignore
    }
  }

  // Alternative: open the extension's popup via chrome://extensions/?id=... is not straightforward.
  // Strategy: open the filter.html directly using the extension's temporary id discovered from background target.

  const backgroundTargets = targets.filter(t => t.type() === 'service_worker' || t.type() === 'background_page');
  for (const t of backgroundTargets) {
    const url = t.url();
    if (url && url.startsWith('chrome-extension://')) {
      const m = url.match(/^chrome-extension:\/\/([^\/]+)\//);
      if (m) { extensionId = m[1]; break; }
    }
  }

  if (!extensionId) {
    console.warn('Could not determine extension id automatically. Attempting to open extension page via chrome-extension://<id>/filter.html may fail.');
  } else {
    console.log('Detected extension id:', extensionId);
  }

  // Helper to capture direct popup or open filter.html
  async function captureFilter() {
    if (extensionId) {
      const extUrl = `chrome-extension://${extensionId}/filter.html`;
      console.log('Opening', extUrl);
      const p = await browser.newPage();
      await p.goto(extUrl, { waitUntil: 'networkidle2' });
      await p.waitForTimeout(500);
      await p.screenshot({ path: path.join(outDir, 'filter-window.png'), fullPage: true });
      await p.close();
    } else {
      // Try clicking the extension icon - not trivial in Puppeteer; fallback to instruct user
      console.warn('No extension id; please open filter.html manually in the launched browser and the script will wait for ENTER to capture.');
      console.log('Open filter.html from the extension folder in the launched browser, then press ENTER.');
      await new Promise(resolve => process.stdin.once('data', resolve));
      const pages = await browser.pages();
      const active = pages[pages.length - 1];
      await active.screenshot({ path: path.join(outDir, 'filter-window-manual.png'), fullPage: true });
    }
  }

  // Capture filter UI
  await captureFilter();

  // TODO: add more captures for delete confirmation, duplicate view, youtube batch UI

  console.log('Screenshots saved to', outDir);
  console.log('When finished, close the browser to exit the script.');
})();
