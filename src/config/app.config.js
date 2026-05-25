/**
 * Centralized app configuration.
 * Keep all branding, endpoints, and feature flags here.
 * NEVER hardcode personal info — all contact goes through the privacy email.
 */
export const APP_CONFIG = Object.freeze({
  studio: {
    name: 'Games Studio 2026',
    short: 'Games Studio',
    year: 2026,
    contactEmail: 'support@gamesstudio2026.com'
  },
  routes: {
    home: '/',
    library: '/library',
    settings: '/settings',
    detail: '/game/:id',
    play: '/play/:id'
  },
  i18n: {
    fallback: 'en',
    supported: ['en', 'id', 'es', 'fr', 'ja']
  },
  performance: {
    targetFps: 60,
    minFps: 30,
    frameSkipThresholdMs: 1000 / 30,
    lowEndRamMb: 4096,
    objectPoolDefault: 64
  },
  storage: {
    keyPrefix: 'gs2026:',
    saveSlot: 'gs2026:save',
    settingsKey: 'gs2026:settings'
  },
  ads: {
    enabled: true,
    adsenseClient: '',           // fill ca-pub-XXXXXXXXXXXXXXXX before deploy
    slots: {
      catalogTop: '0000000001',
      detailBanner: '0000000002',
      interstitial: '0000000003',
      rewarded: '0000000004'
    },
    cooldownMs: 60_000           // anti-spam: min interval between interstitials
  },
  features: {
    serviceWorker: true,
    pwaInstallPrompt: true,
    hapticFeedback: true
  }
});
