(function (window) {
  'use strict';

  const liffId = window.TAXI_CONFIG && window.TAXI_CONFIG.liffId;

  function signal(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  if (!liffId) {
    signal('liff:error', { reason: 'missing-id' });
    window.LIFF_READY = Promise.resolve(false);
    return;
  }

  if (!window.liff || typeof window.liff.init !== 'function') {
    signal('liff:error', { reason: 'sdk-unavailable' });
    window.LIFF_READY = Promise.resolve(false);
    return;
  }

  // The calculator does not need LINE identity or login. LIFF initialization
  // only enables the page to be launched correctly from a LINE LIFF URL.
  window.LIFF_READY = window.liff.init({
    liffId,
    withLoginOnExternalBrowser: false
  }).then(function () {
    const state = { inClient: window.liff.isInClient() };
    signal('liff:ready', state);
    return state;
  }).catch(function (error) {
    signal('liff:error', { reason: 'initialization-failed', error });
    return false;
  });
})(window);
