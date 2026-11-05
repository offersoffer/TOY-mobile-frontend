import { apiClient } from './client';
import type { ApiSuccess, Registration, RegistrationPayload } from '../types';

/**
 * Self-service seller registration (Self-Service Onboarding §4, §21).
 *
 * Every step is saved to the server as it is finished, and nothing is cached
 * locally: §4 requires a seller's progress to survive them leaving, and on a
 * phone "leaving" includes the OS killing the app in the background. The
 * server is the only copy that counts.
 */

/** Everything this seller has in flight; drives the resume prompt (§4). */
export async function mine(): Promise<Registration[]> {
  const res = await apiClient.get<ApiSuccess<Registration[]>>('/onboarding/me');
  return res.data.data;
}

export async function get(shopId: number): Promise<Registration> {
  const res = await apiClient.get<ApiSuccess<Registration>>(`/onboarding/${shopId}`);
  return res.data.data;
}

export async function start(payload: RegistrationPayload): Promise<Registration> {
  const res = await apiClient.post<ApiSuccess<Registration>>('/onboarding', payload);
  return res.data.data;
}

/** Saves one wizard step. Called on every step change, not just at the end. */
export async function save(shopId: number, payload: RegistrationPayload): Promise<Registration> {
  const res = await apiClient.patch<ApiSuccess<Registration>>(`/onboarding/${shopId}`, payload);
  return res.data.data;
}

/**
 * Submits for review (§10).
 *
 * Safe to retry: the server returns the registration unchanged if it is
 * already pending, so a request that times out on a patchy connection after
 * the server accepted it does not show the seller an error for something that
 * worked (§24).
 */
export async function submit(shopId: number): Promise<Registration> {
  const res = await apiClient.post<ApiSuccess<Registration>>(`/onboarding/${shopId}/submit`, {
    acceptedTerms: true,
  });
  return res.data.data;
}
