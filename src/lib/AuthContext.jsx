import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { createAxiosClient } from "@base44/sdk/dist/utils/axios-client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = useCallback(async ({ requireAuthentication = false } = {}) => {
    setIsLoadingAuth(true);

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser || null);
      setIsAuthenticated(Boolean(currentUser));
      setAuthError(null);
      return currentUser || null;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);

      if (requireAuthentication && (error?.status === 401 || error?.status === 403)) {
        setAuthError({ type: "auth_required", message: "Authentication required" });
      } else if (error?.status !== 401 && error?.status !== 403) {
        console.error("User auth check failed:", error);
      }

      return null;
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    const appClient = createAxiosClient({
      baseURL: "/api/apps/public",
      headers: { "X-App-Id": appParams.appId },
      token: appParams.token,
      interceptResponses: true,
    });

    try {
      const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
      setAppPublicSettings(publicSettings);
      await checkUserAuth({ requireAuthentication: false });
    } catch (appError) {
      console.error("App state check failed:", appError);
      const reason = appError?.status === 403 ? appError?.data?.extra_data?.reason : null;

      if (reason === "auth_required") {
        setAuthError({ type: "auth_required", message: "Authentication required" });
      } else if (reason === "user_not_registered") {
        setAuthError({ type: "user_not_registered", message: "User not registered for this app" });
      } else {
        setAuthError({
          type: "unknown",
          message: appError?.message || "Failed to load app",
        });
      }

      setIsLoadingAuth(false);
      setAuthChecked(true);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const loginWithGoogle = useCallback(() => {
    base44.auth.loginWithProvider("google", window.location.href);
  }, []);

  const logout = useCallback((shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);
    base44.auth.logout(shouldRedirect ? window.location.href : undefined);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        loginWithGoogle,
        logout,
        navigateToLogin: loginWithGoogle,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
