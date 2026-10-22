const LAUNCH_URI = 'luna://com.webos.applicationManager/launch';

export function createDevice(scope) {
  const isTV = typeof scope.PalmServiceBridge === 'function';
  const inFlight = new Set();
  return {
    isTV,
    launch(id) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,254}$/.test(id)) return Promise.reject(new Error('This app shortcut is invalid.'));
      if (!isTV) {
        scope.dispatchEvent(new scope.CustomEvent('myowntv:preview-launch', { detail: { id } }));
        return Promise.resolve({ preview: true });
      }
      return new Promise((resolve, reject) => {
        let settled = false;
        const bridge = new scope.PalmServiceBridge();
        inFlight.add(bridge);
        const timer = scope.setTimeout(() => finish(new Error('The TV did not respond. Press Home and open the app from LG Home.')), 8000);
        function finish(error) {
          if (settled) return;
          settled = true;
          scope.clearTimeout(timer);
          bridge.onservicecallback = null;
          if (typeof bridge.cancel === 'function') bridge.cancel();
          inFlight.delete(bridge);
          error ? reject(error) : resolve({ preview: false });
        }
        bridge.onservicecallback = response => {
          try {
            const result = JSON.parse(response);
            if (result.returnValue === true) finish();
            else finish(new Error('The TV could not open this app. Check it in LG Content Store, then try again.'));
          } catch (_) { finish(new Error('The TV returned an unreadable response. Try opening the app from LG Home.')); }
        };
        try { bridge.call(LAUNCH_URI, JSON.stringify({ id })); } catch (_) { finish(new Error('This TV could not open the app shortcut. Use LG Home to open it.')); }
      });
    },
    exit() {
      const system = scope.webOSSystem || scope.PalmSystem;
      if (system && typeof system.platformBack === 'function') system.platformBack();
      else scope.dispatchEvent(new scope.CustomEvent('myowntv:preview-exit'));
    }
  };
}
