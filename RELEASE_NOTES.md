# Release notes for notebooklm-source-manager

Version: 1.2.26

## Summary
- Updated display name and localized extension names (English and Japanese).
- YouTube batch-add UI and localized tab labels refined.
- Locale updates and build pipeline improvements.

## Changes
- Localization: updated `_locales/en/messages.json` and `_locales/ja/messages.json` for new extension names and descriptions.
- UI: unified tab and heading labels to "一括追加モード" / "Batch Add URL Mode" as appropriate.
- Build: bump-on-build behavior used to create release with version 1.2.26.

## Notes
- Deletion operations are irreversible. Please double-check before bulk deletion.
- If Chrome displays old labels, try removing and reloading the unpacked extension from `dist` to ensure the updated `_locales` are loaded.
