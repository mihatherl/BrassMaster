# Device testing log

Faults found on real hardware, during the 4.x phone passes and after. One
entry per fault, dated, naming the device and the exact build — the version
line under Start exists so a stale copy cannot impersonate a fix. An entry
stays until the fix is *verified on the device that showed it*, which is the
lesson this repository has now paid for twice: a picture can disagree with a
phone, and the phone is right.

## Open

### My Music does not import — E32, Play build v2.46.1 (2026-08-23)

Reported by the player from the Play-installed internal-testing build, the
first session on the real shell. "Doesn't import" — exact failure shape not
yet observed: to establish on repro, whether the file chooser opens at all,
opens but returns nothing, or returns a file that then fails to read.

Candidate causes for the investigating session, in the order worth
suspecting them:

- **The WebView's file chooser.** `ImportScreen` uses a plain
  `<input type="file">`; inside a WebView that only works if the Chrome
  client implements `onShowFileChooser`. Capacitor's does, but the E32 is
  System WebView 94 on Android 11, and this is exactly the class of thing
  the PWA never exercised in-shell. Check first — it decides whether this is
  a shell problem or an importer problem.
- **The `accept` filter.** The input's accept list may interact differently
  with Android's document picker inside the WebView than in Chrome —
  `.mxl`/`.musicxml` are not registered MIME types on most devices, and an
  over-strict filter can grey every file out, which to a player is
  indistinguishable from "doesn't import".
- **Not the decompression.** `DecompressionStream` has been in Chromium
  since 80 and the PWA imported on this same WebView engine — suspect the
  chooser plumbing before the importer.

The debugging route is already proven: the shell's WebView answers CDP over
`adb forward` (`webview_devtools_remote_<pid>`), so the failure can be
watched live rather than theorised about. Needs the E32 on the cable.

## Closed

*(none yet)*
