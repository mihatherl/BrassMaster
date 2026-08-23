package net.brassmaster.app;

import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * What the OS says the sound is going to — the capability roadmap 4.2 ruled
 * into the shell, promoted from the container spike where it was proven on
 * the E32 with the player's own Bose QC45 (named by product name, plus a
 * connect signal; `../container-spike/FINDINGS.md` § 4).
 *
 * The web layer cannot see any of this: output devices are not enumerated on
 * Android Chrome, and labels need the microphone permission besides. The
 * shell reads it from AudioManager and hands it over the bridge, where the
 * outputs screen prefills the name of a new output and the app switches the
 * calibration profile when the route changes — retiring the
 * "forgot-to-switch, played a whole session 330ms late" failure.
 *
 * What the spike's copy did not have is the change signal: an
 * AudioDeviceCallback registered on load, forwarded as a `routeChanged`
 * event carrying the same payload `outputs()` returns, so the web side has
 * one shape to read however it hears about the route.
 */
@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {

    private AudioDeviceCallback callback;

    @Override
    public void load() {
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        callback = new AudioDeviceCallback() {
            @Override
            public void onAudioDevicesAdded(AudioDeviceInfo[] added) {
                notifyListeners("routeChanged", snapshot());
            }

            @Override
            public void onAudioDevicesRemoved(AudioDeviceInfo[] removed) {
                notifyListeners("routeChanged", snapshot());
            }
        };
        // Main-looper handler: the callback fires on it, and notifyListeners
        // is safe from there.
        am.registerAudioDeviceCallback(callback, new Handler(Looper.getMainLooper()));
    }

    @Override
    protected void handleOnDestroy() {
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (callback != null) am.unregisterAudioDeviceCallback(callback);
    }

    @PluginMethod
    public void outputs(PluginCall call) {
        call.resolve(snapshot());
    }

    private JSObject snapshot() {
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        JSArray list = new JSArray();
        for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
            JSObject o = new JSObject();
            o.put("type", typeName(d.getType()));
            o.put("productName", String.valueOf(d.getProductName()));
            list.put(o);
        }
        JSObject out = new JSObject();
        out.put("outputs", list);
        out.put("wiredOn", am.isWiredHeadsetOn());
        out.put("bluetoothA2dpOn", am.isBluetoothA2dpOn());
        return out;
    }

    private String typeName(int type) {
        switch (type) {
            case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER: return "builtin speaker";
            case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE: return "builtin earpiece";
            case AudioDeviceInfo.TYPE_WIRED_HEADPHONES: return "wired headphones";
            case AudioDeviceInfo.TYPE_WIRED_HEADSET: return "wired headset";
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP: return "bluetooth a2dp";
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO: return "bluetooth sco";
            case AudioDeviceInfo.TYPE_USB_HEADSET: return "usb headset";
            case AudioDeviceInfo.TYPE_USB_DEVICE: return "usb device";
            default: return "type " + type;
        }
    }
}
