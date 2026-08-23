# The Android shell — the plan for roadmap 4.2

*Drafted 2026-08-23, the day the container spike closed. Everything here
stands on `../container-spike/FINDINGS.md`, which is measurement, not
assumption: the toolchain builds and installs from this machine, the
microphone runs while the tone plays, input latency is ~100–140ms and dead
stable, the OS names the player's own headphones, and the in-process HTTP
server survives everything but doze.*

## What 4.2 is, and is not

**It is:** the `VITE_TARGET=app` build inside a Capacitor 8 shell, signed and
uploaded from Linux to Play internal testing, plus the one native capability
the roadmap ruled into the same pass — **the shell reads the audio route**:
it prefills the name when the player adds an output, and it switches the
calibration profile when the route changes, which retires the
"forgot-to-switch, played a whole session 330ms late" failure instead of
documenting it.

**It is not:** the microphone (Phase 2), the tuner (Phase 3), the library
server and its foreground service (Phase 5 — the spike proved the server
needs one only to survive the screen timeout, and nothing in 4.2 runs a
server), or iOS (4.4, when the hardware exists). It is also not v3.0.0:
the launch waits for the microphone and the tuner (roadmap 4.3); what 4.2
puts on internal testing is the current v2.x app build, wrapped, so every
later phase lands on a shell that already installs, updates and ships.

## Where the shell lives — ratifying the roadmap's recommendation

**In this repository, at `android/`.** The roadmap recommended it and left it
unratified; this plan adopts it, for the reason already recorded: the shell
and the web build it wraps are one product with one version number, and a
separate repository is a mechanism for letting them drift apart. The spike
stays where it is, closed — its two plugins are promoted by copying the
files, comments and all, not by merging repositories.

What `android/` costs the repo: generated Capacitor scaffolding, and a
`.gitignore` that keeps build output and `local.properties` (which names this
machine's SDK path) out of a public repository. **No signing key is ever
committed** — see below.

## The wrapper

- **Capacitor 8, `appId net.brassmaster.app`** — the id the roadmap reserved,
  which can never change once the app is on sale. `appName` "Brass Master".
- **`webDir` is `dist`, built by the shell's own script.** The shell build
  must run `VITE_TARGET=app npm run build` itself and then `npx cap sync` —
  it must never trust whatever `dist/` holds, because every plain build
  overwrites it with some flavour and the tailnet preview trap
  (`handover.md`) has already bitten twice. Same disease, same cure: the
  script owns its inputs.
- **SDK levels as the spike proved them**: minSdk 24, compile/target 36. The
  floor device is the E32 — Android 11, **System WebView 94** — and the shell
  uses the system WebView, so every WebView-94 lesson (`roundRect`,
  `index.css`) applies *inside* the shell exactly as it does in the PWA.
  Nothing about wrapping buys a newer engine.
- **Updates ride Play releases.** The service worker's `autoUpdate` machinery
  is inert inside the shell — assets are baked into the APK, so a new app
  version is a new upload. The version line under Start stays true because it
  is baked in with everything else.

## The audio route — the feature work in this pass

The spike's plugin (`AudioRoutePlugin.java`, 55 lines) already answers
"where is the sound going" with typed names, and the E32 names the player's
Bose QC45 by product name the moment it connects. What 4.2 adds:

1. **A change signal.** The plugin gains an `AudioDeviceCallback` listener
   and emits a `routeChanged` event to the web layer with the same payload
   `outputs()` returns. Polling is the fallback if the callback proves
   unreliable on the E32; measure, don't assume.
2. **One seam module in the web app**, `src/platform/` or similar, behind the
   established composition-root pattern (`SettingsScreen`'s optional
   `onImport`): the shell passes the capability in, the web build passes
   nothing, and no component ever asks "am I in Capacitor". Nothing native
   reaches `engine/` or `exercise/` — the bridge stops at the UI and the
   settings store, the same rule that keeps the importer off the network.
3. **Prefill.** When the player adds an output while a named device is on the
   route, the name box starts filled with the OS's name. A prefill, never a
   lock — the player may call their headphones what they like.
4. **Auto-switch.** An `AudioOutput` created in the shell records the route
   name it was calibrated against (a new optional field, absent on web and
   harmless there — `sanitise` already tolerates unknown absent fields).
   On `routeChanged`:
   - route names a device matching a stored output's route name → switch
     `audioOutputId` to it;
   - route is the builtin speaker → switch to `DEVICE_OUTPUT_ID`, which
     already exists as an output like any other;
   - route names a device no output knows → leave the selection alone and
     say so where the output already announces itself (the gate's status
     line), because switching to a profile that does not exist would be
     inventing a measurement. The screen offers calibration; it does not nag.

   Mid-run, a route change already has a policy: nothing in the engine reads
   the output list during a run, so the switch takes effect at the next gate,
   which is honest — the calibration that was in force when the run started
   is the one the run was judged under.

**Recorded for Phase 2, not built now:** a Bluetooth headset's microphone
arrives over SCO, a worse path than A2DP playback — microphone mode should
probably prefer the phone's own mic even when playback is on the headset.
The spike wrote this down; the detector work picks it up.

## Signing, and the things that cannot be recovered

- **Play App Signing holds the app key; this machine holds only the upload
  key.** Generate the upload keystore locally, outside the repository.
- **This repository is public**: the keystore and its passwords never enter
  it, under any name, in any commit. When CI builds arrive they come from
  GitHub Secrets.
- **An upload key cannot be replaced without Google's help**, so the keystore
  gets a backup somewhere that is not this machine the day it is created —
  not eventually, the same day.

## Versions

`versionName` is `package.json`'s version, read at build time so the two can
never disagree. `versionCode` is derived from it —
`major·100000 + minor·1000 + patch` — so it is monotonic as long as versions
are, and nobody ever hand-bumps a second number. Shell work lands as v2.x
minors like every other paid-feature commit; v3.0.0 stays reserved for the
launch.

## The order of work

1. **Scaffold and first install.** `android/` in this repo, the two-line
   config, the build script that owns its inputs, debug APK on the E32 over
   adb. Done when the installed shell plays a run indistinguishable from the
   installed PWA.
2. **The route capability.** Plugin promoted, change events, seam module,
   prefill and auto-switch wired to the outputs screen and settings. Done
   when connecting the QC45s switches the profile on glass and the gate's
   status line names it — the player's own headphones are the test rig.
3. **Signed release.** Upload keystore created and backed up, release AAB
   built from the command line, installed and sane on the E32.
4. **The listing.** Play developer account (the player's action, US$25 —
   opened now that there is something to ship from it, which is exactly the
   timing the roadmap's dormancy warning asked for), internal testing track,
   first upload, the player installs from Play.

Each step is useful alone and none blocks the free app: a shell session and
a web session touch disjoint files, and the gate stays exactly as it is —
shell builds get their own scripts and are not in the test/build/lint gate,
because a gate that needs the Android SDK stops being a gate anyone runs.

## Open questions, named so they are not forgotten

- **Whether the auto-switch announces itself.** Silent is what "retires the
  failure" means, but a player who chose the speaker deliberately (testing,
  sharing) has just been overruled by their headphones reconnecting. The
  current lean: switch silently, say it on the gate's status line where the
  output already announces itself, and revisit with the player's hands on it.
- **Route matching by product name** assumes names are stable per device.
  Two pairs of identical headphones collide; a renamed device orphans its
  profile. Fine for one player's four outputs; noted in case it ever is not.
- **Whether internal-testing uploads track v2.x continuously** or only when
  a phase lands. Continuous is more honest and more work; decide when the
  first upload exists.
- **`interactive-widget` and the keyboard** inside the shell: the WebView is
  not Chrome, and the one text input (naming an output) should be tried on
  glass early, given what the iPhone's keyboard did to the window scroll.
