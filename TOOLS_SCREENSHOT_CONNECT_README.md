Screenshot (connect-mode) instructions

This explains how to start a real Chrome instance with a dedicated profile that is already signed-in to Google, enable remote debugging, and run the connect-mode Puppeteer script to capture screenshots of the unpacked extension.

Steps (macOS / zsh):

1) Create a dedicated profile directory and start Chrome with it (first time will open Chrome fresh):

```bash
# create a profile dir
mkdir -p ~/chrome-notebooklm-profile

# start Chrome with that profile and a remote debugging port 9222
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir="$HOME/chrome-notebooklm-profile" \
  --remote-debugging-port=9222 \
  --no-first-run --no-default-browser-check &
```

2) In the launched Chrome window, sign in to your Google account and open NotebookLM: https://notebooklm.google.com/ . Make sure NotebookLM works and you can see your notebooks.

3) With Chrome still running, in this repo run:

```bash
npm run screenshot:connect -- --browserURL=http://localhost:9222
```

4) The script will connect to the running Chrome, attempt to discover the temporary extension id, and open `filter.html` to capture screenshots. Follow on-screen prompts if manual interaction is requested.

Notes:
- Do not let the script try to sign in to Google automatically. Use a real logged-in profile to avoid Google blocking automated sign-ins.
- The browser must be the full Chrome app (not a headless/bundled Chromium) for Google OAuth compatibility.
