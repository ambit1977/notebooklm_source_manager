# Reply to the store reviewer (English)

Latest version: **1.2.43** — submitted to the Chrome Web Store, currently in review.
Published version at the time of writing: 1.2.42.

Measured improvement (v1.2.43 vs v1.2.42):
- visible tab: ~3.5s → ~0.15s per source (about 20× faster)
- background tab: ~5.5s → ~1.78s per source (about 3× faster)
- initial source list load: ~12s → ~0.3s

---

## Short version — for the Chrome Web Store developer reply

Thank you for the detailed feedback — the slowness you described is fixed.

Version 1.2.43 is submitted and currently in review, so it isn't live on the store
yet. If you'd like to try it before then, the exact same build is available here:

https://ambit1977.github.io/notebooklm_source_manager/

The Install page has step-by-step instructions (Developer mode → Load unpacked).

What changed:
- Deletion is roughly 20× faster in a visible tab, and about 3× faster when the
  notebook tab is in the background.
- Chrome throttles timers in background tabs, which was the main reason it crawled
  when you switched away. The extension no longer relies on those timers.
- New "Abort deletion" button, so a long run can be stopped partway.

If anything is still slow or broken, please let me know on GitHub Issues:
https://github.com/ambit1977/notebooklm_source_manager/issues

---

## Longer version — for email or a GitHub Issue reply

Thanks for taking the time to write that up. Both problems you hit were real, and
both are fixed in version 1.2.43.

On the slowness: the extension waited on fixed timers between each deletion. That
was already wasteful, but it got much worse in a background tab, because Chrome
clamps timers to a minimum of one second there. Deleting a long list while you
worked in another tab was therefore about as slow as it could possibly be. The
extension now watches the page for the change it is waiting for and proceeds the
moment it happens, instead of sleeping for a fixed interval. Measured on my own
notebooks, deletion went from about 3.5 seconds per source to about 0.15 seconds
in a visible tab, and from about 5.5 seconds to about 1.8 seconds in a background
tab. Loading the source list dropped from roughly 12 seconds to under a second.

On being unable to stop it: there is now an "Abort deletion" button that appears
while a run is in progress. It stops before the next source, and reports how many
were removed.

Version 1.2.43 is with the Chrome Web Store review team right now, so it may be a
few days to a few weeks before it appears as an automatic update. In the meantime
you can install the identical build directly:

https://ambit1977.github.io/notebooklm_source_manager/

Download the ZIP, unzip it, then in chrome://extensions turn on Developer mode and
click "Load unpacked". Keep the unzipped folder somewhere permanent — Chrome reads
it on every startup. If you have both this and the store version loaded, you'll see
two identical toolbar icons, so it's worth disabling one of them.

If you run into anything else, GitHub Issues is the fastest way to reach me:
https://github.com/ambit1977/notebooklm_source_manager/issues
