---
permalink: /assets/js/cookie-consent-setup.js
---
/**
 * Cookie Consent Configuration
 * Documentation: https://cookieconsent.orestbida.com/
 *
 * GDPR-Compliant Approach:
 * - Analytics scripts use type="text/plain" data-category="analytics"
 * - The library blocks all marked scripts until user consents
 * - Scripts NEVER run until explicit consent is given
 * - Google Consent Mode is used for Google Analytics privacy mode before consent
 * - Other analytics (Cronitor, Pirsch, OpenPanel) are blocked until consent given
 *
 * Supported Analytics Providers:
 * - Cronitor RUM
 * - Google Analytics (GA4)
 * - OpenPanel Analytics
 * - Pirsch Analytics
 */

// Initialize Google Consent Mode BEFORE any tracking
// This tells Google services to operate in privacy mode until user consents
window.dataLayer = window.dataLayer || [];

// Reuse existing global gtag if it was already defined (e.g. by other GA scripts)
// to avoid redefining it multiple times when consent is granted.
if (typeof window.gtag !== 'function') {
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
}

// Local alias for convenience in this file
var gtag = window.gtag;
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'analytics_storage': 'denied',
  'functionality_storage': 'denied',
  'personalization_storage': 'denied'
});

// Wait for the library to be available
var cookieConsentRetryCount = 0;
var COOKIE_CONSENT_MAX_RETRIES = 50; // 5 seconds max wait time

function initializeCookieConsent() {
  // Check if CookieConsent is available
  if (!window.CookieConsent) {
    if (cookieConsentRetryCount++ < COOKIE_CONSENT_MAX_RETRIES) {
      // Library not yet loaded, try again after a short delay
      setTimeout(initializeCookieConsent, 100);
    } else {
      console.error('CookieConsent library failed to load');
    }
    return;
  }

  window.CookieConsent.run({
    categories: {
      necessary: {
        enabled: true,
        readOnly: true
      },
      analytics: {}
    },

    language: {
      default: 'en',
      translations: {
        en: {
          consentModal: {
            title: 'This website uses cookies',
            description: 'This website uses cookies to improve your experience and analyze site traffic. By clicking "Accept all", you consent to our use of cookies.',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Reject all',
            showPreferencesBtn: 'Manage Individual preferences'
          },
          preferencesModal: {
            title: 'Manage cookie preferences',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Reject all',
            savePreferencesBtn: 'Accept current selection',
            closeIconLabel: 'Close modal',
            sections: [
              {
                title: 'Cookie usage',
                description: 'This website uses cookies to ensure the basic functionalities of the website and to enhance your online experience. You can choose for each category to opt-in/out whenever you want.'
              },
              {
                title: 'Strictly Necessary cookies',
                description: 'These cookies are essential for the proper functioning of the website. Without these cookies, the website would not work properly.',
                linkedCategory: 'necessary'
              },
              {
                title: 'Analytics cookies',
                description: 'These cookies allow us to measure traffic and analyze your behavior to improve our service.',
                linkedCategory: 'analytics'
              },
              {
                title: 'More information',
                description: 'For any queries in relation to our policy on cookies and your choices, please <a class="cc-link" href="{{ site.url }}{{ site.baseurl }}/#contact">contact us</a>.'
              }
            ]
          }
        }
      }
    },

    // Callback on every page load where consent already exists
    onConsent: function() {
      updateConsentMode();
    },

    // Callback when user accepts/rejects consent for the first time
    onFirstConsent: function() {
      updateConsentMode();
    },

    // Callback when user changes preferences
    onChange: function() {
      updateConsentMode();
    }
  });

  /**
   * Update Google Consent Mode based on user preferences
   * This ensures Google services respect user choices
   */
  function updateConsentMode() {
    // Use the CookieConsent API directly — it's reliable across all callbacks
    var analyticsAccepted = window.CookieConsent && window.CookieConsent.getCategories().analytics;

    gtag('consent', 'update', {
      'analytics_storage': analyticsAccepted ? 'granted' : 'denied',
      'ad_storage': 'denied',
      'functionality_storage': 'denied',
      'personalization_storage': 'denied'
    });

    if (analyticsAccepted) {
      console.debug('✓ Analytics consent granted - tracking enabled for all providers');
    } else {
      console.debug('✗ Analytics consent denied - no tracking data collected');
    }
  }
}

// Initialize when the library is available
initializeCookieConsent();

