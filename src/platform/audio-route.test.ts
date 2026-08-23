/*
 * The route logic is a guard — it decides whose calibration is in force
 * without the player touching anything — so its rules are pinned rather than
 * trusted. The payload shapes mirror what the plugin actually returned on
 * the E32 (spike FINDINGS § 4, and the live probe of 2026-08-23): built-ins
 * carry the handset's own product name, external devices their own.
 */

import { describe, expect, it } from 'vitest';
import { audioRouteCapability, outputForRoute, routeDeviceName, type RouteSnapshot } from './audio-route';
import { DEVICE_OUTPUT_ID, type AudioOutput } from '../storage/settings';

const bare: RouteSnapshot = {
  outputs: [
    { type: 'builtin speaker', productName: 'moto e32' },
    { type: 'builtin earpiece', productName: 'moto e32' },
    { type: 'type 18', productName: 'moto e32' },
  ],
  wiredOn: false,
  bluetoothA2dpOn: false,
};

const withBose: RouteSnapshot = {
  ...bare,
  outputs: [
    ...bare.outputs,
    { type: 'bluetooth a2dp', productName: 'Bose QC45' },
    { type: 'bluetooth sco', productName: 'Bose QC45' },
  ],
  bluetoothA2dpOn: true,
};

const output = (over: Partial<AudioOutput>): AudioOutput => ({
  id: 'x',
  name: 'Headphones',
  leadMs: 200,
  calibrations: 1,
  ...over,
});

describe('routeDeviceName', () => {
  it('is null for the bare handset — built-ins are matched by id, not name', () => {
    expect(routeDeviceName(bare)).toBeNull();
  });

  it('names the external device', () => {
    expect(routeDeviceName(withBose)).toBe('Bose QC45');
  });

  it('names wired headphones by their product name', () => {
    const wired: RouteSnapshot = {
      ...bare,
      outputs: [...bare.outputs, { type: 'wired headphones', productName: 'moto e32' }],
      wiredOn: true,
    };
    expect(routeDeviceName(wired)).toBe('moto e32');
  });
});

describe('outputForRoute', () => {
  it('falls back to the device speaker when the route is the handset', () => {
    expect(outputForRoute(bare, [output({ id: 'bose', routeName: 'Bose QC45' })])).toBe(
      DEVICE_OUTPUT_ID,
    );
  });

  it('chooses the output calibrated against the connected hardware', () => {
    const outputs = [
      output({ id: 'buds', routeName: 'Pixel Buds' }),
      output({ id: 'bose', routeName: 'Bose QC45' }),
    ];
    expect(outputForRoute(withBose, outputs)).toBe('bose');
  });

  /* Switching to a profile that does not exist would be inventing a
     measurement, so an unknown device changes nothing. */
  it('leaves the choice alone for hardware no output knows', () => {
    expect(outputForRoute(withBose, [output({ id: 'buds', routeName: 'Pixel Buds' })])).toBeNull();
  });
});

describe('audioRouteCapability', () => {
  it('is absent outside the shell', () => {
    // jsdom has no Capacitor bridge, which is exactly the web's situation.
    expect(audioRouteCapability()).toBeUndefined();
  });
});
