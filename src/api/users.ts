import { apiClient } from './client';
import type { ApiSuccess, PreferredLocation, User } from '../types';

export interface UpdateMePayload {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  preferredLocation?: PreferredLocation | null;
}

export async function updateMe(payload: UpdateMePayload): Promise<User> {
  const res = await apiClient.put<ApiSuccess<User>>('/users/me', payload);
  return res.data.data;
}

/**
 * Permanently deletes the signed-in account (Play "Data deletion" policy).
 *
 * The password travels in the body, so this uses axios's `data` option —
 * `apiClient.delete(url, payload)` would send the payload as config and drop
 * it silently, which reads as "password is required" from the server.
 *
 * Throws 409 when the user manages a shop and 403 when they are platform
 * staff; both carry a message the screen shows verbatim.
 */
export async function deleteMe(password: string): Promise<void> {
  await apiClient.delete('/users/me', { data: { password } });
}
