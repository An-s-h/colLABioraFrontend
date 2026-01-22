import { useEffect, useState } from 'react';

/**
 * React hook for Cookiebot integration
 * Provides access to Cookiebot consent state and methods
 * 
 * @returns {Object} Cookiebot state and methods
 */
export const useCookiebot = () => {
  const [cookiebotReady, setCookiebotReady] = useState(false);
  const [consent, setConsent] = useState({
    necessary: true,
    preferences: false,
    statistics: false,
    marketing: false,
    method: null,
    consented: false,
    declined: false,
    hasResponse: false,
  });

  useEffect(() => {
    // Check if Cookiebot is loaded
    const checkCookiebot = () => {
      if (window.Cookiebot) {
        setCookiebotReady(true);
        updateConsentState();
      }
    };

    // Update consent state from Cookiebot
    const updateConsentState = () => {
      if (window.Cookiebot) {
        setConsent({
          necessary: window.Cookiebot.consent.necessary || true,
          preferences: window.Cookiebot.consent.preferences || false,
          statistics: window.Cookiebot.consent.statistics || false,
          marketing: window.Cookiebot.consent.marketing || false,
          method: window.Cookiebot.consent.method || null,
          consented: window.Cookiebot.consented || false,
          declined: window.Cookiebot.declined || false,
          hasResponse: window.Cookiebot.hasResponse || false,
        });
      }
    };

    // Listen for Cookiebot events
    const handleConsentReady = () => {
      setCookiebotReady(true);
      updateConsentState();
    };

    const handleAccept = () => {
      updateConsentState();
    };

    const handleDecline = () => {
      updateConsentState();
    };

    const handleLoad = () => {
      updateConsentState();
    };

    // Check if already loaded
    checkCookiebot();

    // Add event listeners
    window.addEventListener('CookiebotOnConsentReady', handleConsentReady);
    window.addEventListener('CookiebotOnAccept', handleAccept);
    window.addEventListener('CookiebotOnDecline', handleDecline);
    window.addEventListener('CookiebotOnLoad', handleLoad);

    // Cleanup
    return () => {
      window.removeEventListener('CookiebotOnConsentReady', handleConsentReady);
      window.removeEventListener('CookiebotOnAccept', handleAccept);
      window.removeEventListener('CookiebotOnDecline', handleDecline);
      window.removeEventListener('CookiebotOnLoad', handleLoad);
    };
  }, []);

  // Cookiebot methods
  const show = () => {
    if (window.Cookiebot) {
      window.Cookiebot.show();
    }
  };

  const hide = () => {
    if (window.Cookiebot) {
      window.Cookiebot.hide();
    }
  };

  const renew = () => {
    if (window.Cookiebot) {
      window.Cookiebot.renew();
    }
  };

  const withdraw = () => {
    if (window.Cookiebot) {
      window.Cookiebot.withdraw();
    }
  };

  const submitCustomConsent = (optinPreferences, optinStatistics, optinMarketing) => {
    if (window.Cookiebot) {
      window.Cookiebot.submitCustomConsent(optinPreferences, optinStatistics, optinMarketing);
    }
  };

  const runScripts = () => {
    if (window.Cookiebot) {
      window.Cookiebot.runScripts();
    }
  };

  return {
    cookiebotReady,
    consent,
    show,
    hide,
    renew,
    withdraw,
    submitCustomConsent,
    runScripts,
  };
};

