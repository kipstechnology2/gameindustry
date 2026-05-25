/**
 * Device & capability detection.
 * Used by virtual-pad to decide D-Pad vs keyboard, and by frame-budget for adaptive rendering.
 */

export const Device = (() => {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const platform = (typeof navigator !== 'undefined' && navigator.platform) || '';

  const isTouch = (typeof window !== 'undefined') &&
    ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);

  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1); // iPadOS spoof
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi/i.test(ua);
  const isTablet = /Tablet|iPad/i.test(ua) || (isAndroid && !/Mobile/i.test(ua));
  const isDesktop = !isMobile && !isTablet;

  // Heuristic: low-end if deviceMemory <= 4GB, hardwareConcurrency <= 4, or save-data on
  const deviceMemory = (typeof navigator !== 'undefined' && navigator.deviceMemory) || null;
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || null;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const isLowEnd = (deviceMemory && deviceMemory <= 4) || (cores && cores <= 4) || saveData;

  const prefersReducedMotion = (typeof window !== 'undefined') &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const language = (typeof navigator !== 'undefined' &&
    (navigator.languages?.[0] || navigator.language)) || 'en';

  return Object.freeze({
    isTouch,
    isIOS,
    isAndroid,
    isMobile,
    isTablet,
    isDesktop,
    isLowEnd,
    deviceMemory,
    cores,
    saveData,
    prefersReducedMotion,
    language,
    // Returns 'mobile' | 'tablet' | 'desktop'
    formFactor: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  });
})();
