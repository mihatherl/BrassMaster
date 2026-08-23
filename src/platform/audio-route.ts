/**
 * The audio route, as the native shell knows it — the one capability roadmap
 * 4.2 ruled into the Android pass.
 *
 * No browser the app runs on can see where sound is going: output devices are
 * not enumerated on Android Chrome, labels need the microphone permission
 * besides, and `setSinkId` is desktop-only. The shell's `AudioRoutePlugin`
 * reads it from the OS (`AudioManager`), which names the player's own
 * headphones — "Bose QC45", measured on the E32 in the container spike — and
 * signals when the route changes.
 *
 * **The seam.** This module is the only place that knows Capacitor exists.
 * It reads the bridge off `window` rather than importing `@capacitor/core`,
 * which was measured on the live shell (2026-08-23, over CDP to the E32):
 * registered plugins are reachable at `window.Capacitor.Plugins`, complete
 * with `addListener`, so the web bundle carries no native dependency and the
 * same build serves brassmaster.net, the tailnet and the shell. Everything
 * else takes the capability as a value, in the composition-root style of
 * `SettingsScreen`'s `onImport`: absent means the web, and no component ever
 * asks which platform it is on.
 */

import { DEVICE_OUTPUT_ID, type AudioOutput } from '../storage/settings';

/** One output device as the OS reports it. */
export interface RouteDevice {
  /** A stable type word from the plugin: "builtin speaker", "bluetooth a2dp"… */
  type: string;
  /** The OS's name for the hardware: "Bose QC45", or the handset's own name. */
  productName: string;
}

/** What the plugin returns from `outputs()` and sends with `routeChanged`. */
export interface RouteSnapshot {
  outputs: RouteDevice[];
  wiredOn: boolean;
  bluetoothA2dpOn: boolean;
}

export interface AudioRouteCapability {
  outputs(): Promise<RouteSnapshot>;
  /** Subscribe to route changes; returns an unsubscribe. */
  onChange(listen: (snapshot: RouteSnapshot) => void): () => void;
}

/*
 * The Capacitor bridge, as little of it as is used. Typed here rather than
 * taken from `@capacitor/core`, deliberately: the type is the contract this
 * module verified on the device, and importing the package would put the
 * bridge in the web bundle to get a type.
 */
interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    AudioRoute?: {
      outputs(): Promise<RouteSnapshot>;
      addListener(
        event: 'routeChanged',
        listen: (snapshot: RouteSnapshot) => void,
      ): Promise<{ remove: () => Promise<void> }>;
    };
  };
}

/**
 * The capability, where the shell provides it; undefined on the web, which is
 * the whole instruction — callers pass the absence down, never a flag.
 */
export function audioRouteCapability(): AudioRouteCapability | undefined {
  // No window, no shell: this module is imported by tests that run in node.
  if (typeof window === 'undefined') return undefined;
  const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
  const plugin = cap?.isNativePlatform?.() ? cap.Plugins?.AudioRoute : undefined;
  if (!plugin) return undefined;
  return {
    outputs: () => plugin.outputs(),
    onChange: (listen) => {
      const pending = plugin.addListener('routeChanged', listen);
      return () => {
        void pending.then((handle) => handle.remove());
      };
    },
  };
}

/*
 * The route's headline device: the external thing the sound is actually
 * going to, or null when it stays in the handset. A phone always lists its
 * built-ins (and a telephony route), so "external" is what is worth naming —
 * the same judgement the spike recorded: for built-ins the *type* is the
 * useful name, and for everything else it is the product name.
 */
const EXTERNAL_TYPES = [
  'bluetooth a2dp',
  'wired headphones',
  'wired headset',
  'usb headset',
  'usb device',
];

export function routeDeviceName(snapshot: RouteSnapshot): string | null {
  /* In EXTERNAL_TYPES order, not list order: when a Bluetooth headset and a
     wired pair are both attached the OS routes to whichever it prefers, but
     A2DP is what the QC45 case actually is, and first in the list is the
     best answer available without a routing API. */
  for (const type of EXTERNAL_TYPES) {
    const device = snapshot.outputs.find((o) => o.type === type);
    if (device) return device.productName;
  }
  return null;
}

/**
 * Which stored output a route change selects, or null to leave the choice
 * alone.
 *
 * The rules from `android-shell-plan.md`, in order:
 * - the route names a device some output was calibrated against → that
 *   output, which is the "forgot to switch" failure retired;
 * - the route has fallen back to the handset itself → the device's own
 *   speaker, which is already an output like any other;
 * - the route names a device no output knows → null. Switching to a profile
 *   that does not exist would be inventing a measurement; the gate's status
 *   line already says which output is in force, and the screen offers
 *   calibration rather than nagging.
 */
export function outputForRoute(
  snapshot: RouteSnapshot,
  outputs: readonly AudioOutput[],
): string | null {
  const name = routeDeviceName(snapshot);
  if (name === null) return DEVICE_OUTPUT_ID;
  const known = outputs.find((o) => o.routeName === name);
  return known ? known.id : null;
}
