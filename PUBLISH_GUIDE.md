# Publish Guide — NotebookLM Source Manager

This document describes how to publish a new release to the Chrome Web Store for the NotebookLM extension.

## Before you start
- Ensure you have a Google developer account with access to the Chrome Web Store developer dashboard.
- Prepare the release ZIP: `dist/releases/notebooklm-source-manager-<version>.zip` (we created one in the `dist/releases` directory).
- Confirm `manifest.json` in `dist` has the updated `version`.

## Step-by-step
1. Open the Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/developer/dashboard
2. Select the extension (NotebookLM Source Manager).
3. Click "Edit" on the Store Listing.
   - Update short and long descriptions for each locale (use the copy prepared in the repository or the texts we drafted).
   - Upload screenshots that show the filter window and bulk-delete flow (these help users understand functionality).
4. Save the store listing changes.
5. Upload the new package: go to the "Package" or "Upload new package" section and upload the ZIP from `dist/releases`.
6. After upload, confirm that the manifest's `version` matches the listing and that the package validation succeeds.
7. Click "Publish" and wait for Google to process the update. It may take a few minutes to several hours to appear.

## Tips
- If translations are missing, add them in the listing per-locale pages.
- If you maintain a privacy policy page, add its URL in the store listing to increase trust.
- Keep a changelog (we added `RELEASE_NOTES.md`) and link it in your repo or release page.

## Troubleshooting
- If the updated name/description doesn't appear in Chrome after publishing, try reloading the extension or restarting Chrome. Cached metadata may delay updates.
