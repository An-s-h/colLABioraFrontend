import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

/**
 * Custom hook for Auth0 social login
 * Provides methods to login with Google and Microsoft (Outlook)
 */
export function useAuth0Social() {
  const auth0 = useAuth0();

  // Check if Auth0 is configured
  const isConfigured = !!import.meta.env.VITE_AUTH0_DOMAIN && !!import.meta.env.VITE_AUTH0_CLIENT_ID;

  /**
   * Login with Google
   * @param {Object} options - Optional settings
   * @param {string} options.returnTo - URL to redirect after login
   * @param {Object} options.onboardingData - Data to pass through (role, conditions, etc.)
   */
  const loginWithGoogle = useCallback(async (options = {}) => {
    if (!isConfigured) {
      console.error("[Auth0] Not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID");
      return;
    }

    // Store onboarding data for after OAuth callback
    if (options.onboardingData) {
      localStorage.setItem("auth0_pending_onboarding", JSON.stringify(options.onboardingData));
    }

    try {
      await auth0.loginWithRedirect({
        authorizationParams: {
          connection: "google-oauth2",
          screen_hint: options.screenHint || "signup",
        },
        appState: {
          returnTo: options.returnTo || "/auth/callback",
        },
      });
    } catch (error) {
      console.error("[Auth0] Google login error:", error);
      throw error;
    }
  }, [auth0, isConfigured]);

  /**
   * Login with Microsoft (Outlook)
   * @param {Object} options - Optional settings
   * @param {string} options.returnTo - URL to redirect after login
   * @param {Object} options.onboardingData - Data to pass through (role, conditions, etc.)
   */
  const loginWithMicrosoft = useCallback(async (options = {}) => {
    if (!isConfigured) {
      console.error("[Auth0] Not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID");
      return;
    }

    // Store onboarding data for after OAuth callback
    if (options.onboardingData) {
      localStorage.setItem("auth0_pending_onboarding", JSON.stringify(options.onboardingData));
    }

    try {
      await auth0.loginWithRedirect({
        authorizationParams: {
          connection: "windowslive", // Microsoft connection in Auth0
          screen_hint: options.screenHint || "signup",
        },
        appState: {
          returnTo: options.returnTo || "/auth/callback",
        },
      });
    } catch (error) {
      console.error("[Auth0] Microsoft login error:", error);
      throw error;
    }
  }, [auth0, isConfigured]);

  /**
   * Login with Apple
   * @param {Object} options - Optional settings
   */
  const loginWithApple = useCallback(async (options = {}) => {
    if (!isConfigured) {
      console.error("[Auth0] Not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID");
      return;
    }

    // Store onboarding data for after OAuth callback
    if (options.onboardingData) {
      localStorage.setItem("auth0_pending_onboarding", JSON.stringify(options.onboardingData));
    }

    try {
      await auth0.loginWithRedirect({
        authorizationParams: {
          connection: "apple",
          screen_hint: options.screenHint || "signup",
        },
        appState: {
          returnTo: options.returnTo || "/auth/callback",
        },
      });
    } catch (error) {
      console.error("[Auth0] Apple login error:", error);
      throw error;
    }
  }, [auth0, isConfigured]);

  /**
   * Logout from Auth0
   */
  const logout = useCallback(() => {
    if (!isConfigured) return;
    
    // Clear local storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth0_pending_onboarding");
    
    // Logout from Auth0
    auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0, isConfigured]);

  return {
    loginWithGoogle,
    loginWithMicrosoft,
    loginWithApple,
    logout,
    isAuthenticated: auth0.isAuthenticated,
    isLoading: auth0.isLoading,
    user: auth0.user,
    isConfigured,
  };
}

export default useAuth0Social;

