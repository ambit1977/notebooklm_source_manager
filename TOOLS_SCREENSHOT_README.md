# Screenshot Tool (Puppeteer)

This document explains how to run the automated screenshot tool using Puppeteer. It requires headful Chrome and may require manual login to NotebookLM in the launched profile.

## Install dependencies

```bash
npm install
```

This installs `puppeteer` (bundled Chromium) and other dev deps.

## Run

```bash
npm run screenshot -- --notebookUrl="https://notebooklm.google.com/notebook/..." --profile=./tmp-profile
```

- `--notebookUrl` (optional): the NotebookLM URL to open. Default is the root NotebookLM URL.
- `--profile` (optional): path to a user-data-dir for Chrome. If it doesn't exist, the script will create it. Use a profile where you can log in.

## Flow
1. The script launches Chrome with your `dist` extension loaded. It runs in headful mode. 
2. Log in to NotebookLM in the launched browser if necessary. When ready, press ENTER in the terminal running the script. 
3. The script will try to detect the extension's temporary id and open `filter.html` to capture screenshots. If it can't detect the id, it asks you to open `filter.html` manually in the launched browser and press ENTER again.
4. Screenshots are saved to `dist/screenshots/`.

## Notes & limitations
- The script launches Chrome with a separate user-data-dir; if it's not logged in, you'll need to authenticate manually. 
- Puppeteer may use its own Chromium; if you prefer to use an installed Chrome, modify the `puppeteer.launch` options with `executablePath` set to your Chrome binary.
- Opening the extension popup programmatically is brittle because the extension id is assigned dynamically in an unpacked profile. The script attempts to detect the id from background targets; otherwise it falls back to manual opening.
- For reproducible run (CI), you must provide a pre-authenticated profile (not usually recommended for public CI due to credentials). 

If you want, I can extend the script to capture a sequence of pages (delete confirmation, duplicate results, YouTube batch UI) automatically by navigating to known pages under the extension's `chrome-extension://<id>/` URL once the id is detected.
