import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import * as usersApi from '../api/users';
import { refreshSession, setSessionExpiredHandler } from '../api/client';
import { clearTokens, getTokens, setTokens } from '../services/auth/tokenStorage';
import { unregisterDevice } from '../services/notifications/pushNotifications';
import type { AuthResult, User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * True once the visitor has chosen "Continue as Guest" (Guest Browsing §20).
   *
   * Distinct from `!isAuthenticated`: before the choice is made there is no
   * session *and* no guest, which is the state the welcome screen exists for.
   */
  isGuest: boolean;
  continueAsGuest: () => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  login: (payload: authApi.LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Irreversible. Rejects (leaving the session intact) if the server refuses. */
  deleteAccount: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: usersApi.UpdateMePayload) => Promise<void>;
}

/**
 * Remembers that this device chose to browse without an account, so the
 * welcome screen is a one-time decision rather than a wall on every launch
 * (§20). Not a credential - just a UI preference, hence AsyncStorage rather
 * than secure storage.
 */
const GUEST_FLAG_KEY = 'offers.browsingAsGuest';

/** Where the customer lands after signing in, decided by the backend's roles (§24). */
export function landingFor(user: User | null): 'admin' | 'customer' | 'onboarding' | 'auth' {
  if (!user) return 'auth';
  if (user.canAccessAdmin) return 'admin';
  return user.preferencesCompleted ? 'customer' : 'onboarding';
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthResult = useCallback(async (result: AuthResult) => {
    await setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    setUser(result.user);
    // The account supersedes the guest choice; the flag is cleared so a later
    // logout returns to the welcome screen rather than straight to guest mode.
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_FLAG_KEY).catch(() => {});
  }, []);

  const clearSession = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setIsGuest(false);
    // §25.4 / §26: a revoked or expired session must not leave the previous
    // user's offers, claims or analytics readable from cache.
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      void clearSession();
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  /**
   * Automatic authentication on app start (§23).
   *
   *   secure storage -> refresh token present? -> validate/refresh -> home
   *
   * A stored refresh token is enough to resume: the access token in storage is
   * usually already expired after the app has been closed for a while, so a
   * failed /me is answered with a refresh rather than a trip to the login
   * screen. Only an outright rejection ends the session (§19).
   */
  useEffect(() => {
    (async () => {
      try {
        const tokens = await getTokens();
        if (!tokens) {
          // No session: resume guest browsing if that is what this device chose.
          setIsGuest((await AsyncStorage.getItem(GUEST_FLAG_KEY)) === '1');
          return;
        }

        try {
          setUser(await authApi.fetchMe());
        } catch (error) {
          // The client interceptor already retried once; reaching here with a
          // live refresh token means the access token was rejected before it
          // could. Try explicitly, then give up.
          const refreshed = await refreshSession();
          if (!refreshed) throw error;
          setUser(await authApi.fetchMe());
        }
      } catch {
        await clearTokens().catch(() => {});
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /**
   * §20: "Login / Sign Up  OR  Continue as Guest". Choosing guest is a local
   * decision - no account is created and nothing is sent to the server, because
   * every screen a guest can reach is served by a public endpoint (§25).
   */
  const continueAsGuest = useCallback(async () => {
    setIsGuest(true);
    await AsyncStorage.setItem(GUEST_FLAG_KEY, '1').catch(() => {});
  }, []);

  const register = useCallback(
    async (payload: authApi.RegisterPayload) => {
      const result = await authApi.register(payload);
      await handleAuthResult(result);
    },
    [handleAuthResult],
  );

  const login = useCallback(
    async (payload: authApi.LoginPayload) => {
      const result = await authApi.login(payload);
      await handleAuthResult(result);
    },
    [handleAuthResult],
  );

  /**
   * Ends the persistent session (§25): revoke server-side, clear secure
   * storage, then drop every cached response so the next account that signs in
   * on this device never sees the previous one's data.
   */
  const logout = useCallback(async () => {
    // Before the session goes: the unregister endpoint is authenticated, and
    // leaving this device registered would send the next account's owner the
    // previous customer's notifications (Push §37).
    await unregisterDevice();
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout — clear the local session regardless.
    }
    await clearSession();
    queryClient.clear();
  }, [clearSession, queryClient]);

  /**
   * Deletes the account on the server, then tears the session down exactly as
   * `logout` does (Play "Data deletion" policy).
   *
   * The server call comes first and is deliberately not wrapped in try/catch:
   * it refuses for a wrong password, for a shop's Admin and for platform
   * staff, and in every one of those cases the account still exists - clearing
   * the session would sign the user out of an account they still have.
   *
   * There is no `unregisterDevice()` here, unlike `logout`: `push_devices`
   * cascades with the user row, so the registration is already gone and the
   * call would be an authenticated request with no session left to make it.
   */
  const deleteAccount = useCallback(
    async (password: string) => {
      await usersApi.deleteMe(password);
      await clearSession();
      queryClient.clear();
    },
    [clearSession, queryClient],
  );

  const refreshUser = useCallback(async () => {
    const me = await authApi.fetchMe();
    setUser(me);
  }, []);

  const updateProfile = useCallback(async (payload: usersApi.UpdateMePayload) => {
    const updated = await usersApi.updateMe(payload);
    setUser(updated);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isGuest: !user && isGuest,
      continueAsGuest,
      register,
      login,
      logout,
      deleteAccount,
      refreshUser,
      updateProfile,
    }),
    [user, isLoading, isGuest, continueAsGuest, register, login, logout, deleteAccount, refreshUser, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
