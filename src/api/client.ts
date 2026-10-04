import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/config';
import { deviceHeaders } from '../utils/device';
import { visibilityHeaders } from '../utils/session';
import { clearTokens, getTokens, setTokens } from '../services/auth/tokenStorage';
import type { ApiErrorBody, AuthResult } from '../types';
import type { PlanUpgradeRequiredDetails } from '../types/admin';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  // Names this device in the account's session list (§28).
  headers: { ...deviceHeaders },
});

let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/**
 * Reachability reporter (§36).
 *
 * The client is the only place that knows whether a request left the device,
 * so it tells `NetworkStatusContext` rather than the other way round. A
 * function reference rather than an import to keep the dependency pointing one
 * way: the API layer must not import from the store.
 */
let reportNetwork: ((reachable: boolean) => void) | null = null;
export function setNetworkReporter(reporter: ((reachable: boolean) => void) | null) {
  reportNetwork = reporter;
}

/** True when axios failed before it got any answer at all - §36's offline. */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response && error.code !== 'ECONNABORTED';
}

/** True when the request was sent but nothing came back in time (§50). */
export function isTimeoutError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.code === 'ECONNABORTED';
}

apiClient.interceptors.request.use(async (config) => {
  const tokens = await getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  // Visibility §18/§25: the frequency caps are "per customer/session" and a
  // guest has no user id, so the client says which session and which install
  // this is. Neither is a credential - the backend stores both as salted
  // hashes and only ever compares them within a window.
  const identity = await visibilityHeaders();
  config.headers['X-Session-Id'] = identity['X-Session-Id'];
  config.headers['X-Device-Id'] = identity['X-Device-Id'];
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

/**
 * Exchanges the stored refresh token for a fresh pair (§20).
 *
 * The backend rotates on every use (§29), so the *new* refresh token has to be
 * written back before the old one is discarded - dropping it would sign the
 * user out on the next launch, which is exactly what persistent login is meant
 * to prevent.
 *
 * A network failure is deliberately not treated as a rejected token: the
 * session is only cleared when the server actually says the token is invalid.
 */
async function refreshAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens?.refreshToken) return null;
  try {
    const res = await axios.post<{ success: true; data: AuthResult }>(
      `${API_BASE_URL}/auth/refresh-token`,
      { refreshToken: tokens.refreshToken },
      { headers: { ...deviceHeaders } },
    );
    const { accessToken, refreshToken } = res.data.data;
    await setTokens({ accessToken, refreshToken });
    return accessToken;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    // Offline or server down: keep the token, the next attempt may succeed.
    if (status === undefined) return null;
    await clearTokens();
    return null;
  }
}

/** Refreshes ahead of a request, sharing one in-flight attempt across callers. */
export function refreshSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => {
    reportNetwork?.(true);
    return response;
  },
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    // A status means the server answered, which is proof the network works -
    // even when the answer was a 500.
    //
    // A timeout is deliberately not counted as offline. It is ambiguous: an
    // overloaded server and a dead connection look identical from here, and
    // telling a customer on good Wi-Fi that they are offline is a worse error
    // than saying nothing. §50 gives it its own wording instead.
    const timedOut = error.code === 'ECONNABORTED';
    if (!timedOut) reportNetwork?.(status !== undefined);

    // Any 401 on a non-refresh call is worth one silent refresh attempt (§20):
    // the customer should never see the login screen for an expired access
    // token. Only a refresh that the server rejects ends the session.
    const isRefreshCall = original?.url?.includes('/auth/refresh-token');

    if (status === 401 && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      const newAccessToken = await refreshSession();
      if (newAccessToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient.request(original);
      }
      // No usable token left - the session really is over (§25, §26).
      if (code !== 'TOKEN_EXPIRED' || !(await getTokens())) onSessionExpired?.();
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    const details = body?.error?.details;
    if (Array.isArray(details) && details.length) {
      return details.map((d) => d.message).join('\n');
    }
    if (body?.error?.message) return body.error.message;

    // Three different failures, three different sentences, none of them
    // naming a status code or a host (§53).
    if (error.code === 'ECONNABORTED') {
      // §50. Checked before the no-response case below, which it also matches.
      return 'This is taking longer than expected. Please try again.';
    }
    if (!error.response) {
      // §36.
      return 'You’re offline. Some features may not be available right now. Please reconnect to continue.';
    }
    if (error.response.status >= 500) {
      // §37.
      return 'We’re having trouble connecting to OffersOffer. Please try again.';
    }
  }
  return fallback;
}

/** Extracts the PLAN_UPGRADE_REQUIRED payload when that's what the request failed with, else null. */
export function getPlanUpgradeDetails(error: unknown): PlanUpgradeRequiredDetails | null {
  if (!axios.isAxiosError(error)) return null;
  const body = error.response?.data as ApiErrorBody | undefined;
  if (body?.error?.code !== 'PLAN_UPGRADE_REQUIRED') return null;
  return (body.error.details as unknown as PlanUpgradeRequiredDetails) ?? null;
}
