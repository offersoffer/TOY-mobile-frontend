import axios from 'axios';
import { apiClient, getApiErrorMessage, isNetworkError, isTimeoutError } from './client';
import type { ApiErrorBody, ApiListSuccess, ApiSuccess, PaginationMeta } from '../types';
import type {
  ClaimAttemptBudget,
  ClaimAudit,
  ClaimKind,
  ClaimRejection,
  ClaimVerification,
  MerchantClaim,
  RedemptionSummary,
  VerificationMethod,
} from '../types/admin';

/**
 * The merchant's half of the claim workflow (Claim/Redemption §7-§11, §24).
 *
 * `/redemptions` is a separate router from `/claims` on the server for a
 * reason worth repeating here: nothing a customer can call is allowed to write
 * a redemption (§25, §38.7). Only this module talks to it, and only the Shop
 * Admin screens import this module.
 *
 * Verify and redeem are two calls, not one. The first asks "is this coupon
 * good?" and writes nothing; the second is the shopkeeper saying they handed
 * the benefit over. The gap between them is the whole design - it is what
 * separates a scan from a redemption - so this module never offers a combined
 * helper that would let a screen collapse the two.
 */

/** `code` for a typed code, `qrToken` for a scanned one - never both. */
export interface VerifyPayload {
  code?: string;
  qrToken?: string;
  method: VerificationMethod;
  branchId?: number | null;
}

export async function verifyClaim(payload: VerifyPayload): Promise<ClaimVerification> {
  const res = await apiClient.post<ApiSuccess<ClaimVerification>>('/redemptions/verify', payload);
  return res.data.data;
}

export async function redeemClaim(payload: VerifyPayload): Promise<MerchantClaim> {
  const res = await apiClient.post<ApiSuccess<MerchantClaim>>('/redemptions/redeem', payload);
  return res.data.data;
}

/**
 * The shopkeeper verified a claim and then did not honour it (§32) - the
 * customer changed their mind, the stock ran out. The claim stays live either
 * way; this only records that the counter said no, because a shop that
 * verifies far more than it redeems is worth asking about.
 */
export async function rejectClaim(code: string, reason: string, method: VerificationMethod = 'CODE_ENTRY'): Promise<void> {
  await apiClient.post('/redemptions/reject', { code, reason, method });
}

export async function getRedemptionSummary(shopId?: number): Promise<RedemptionSummary> {
  const res = await apiClient.get<ApiSuccess<RedemptionSummary>>('/redemptions/summary', {
    params: shopId ? { shopId } : undefined,
  });
  return res.data.data;
}

export async function getAttemptBudget(): Promise<ClaimAttemptBudget> {
  const res = await apiClient.get<ApiSuccess<ClaimAttemptBudget>>('/redemptions/attempts');
  return res.data.data;
}

export interface ClaimListParams {
  page?: number;
  limit?: number;
  kind?: ClaimKind;
  shopId?: number;
  search?: string;
  /** `/claims` only; the redeemed list is by definition one status. */
  status?: 'claimed' | 'redeemed' | 'expired' | 'cancelled' | 'revoked' | 'active' | 'all';
  from?: string;
  to?: string;
}

/** Recent Redemptions (§24): redeemed claims only, newest first. */
export async function listRedemptions(
  params: ClaimListParams,
): Promise<{ claims: MerchantClaim[]; meta: PaginationMeta }> {
  const res = await apiClient.get<ApiListSuccess<MerchantClaim>>('/redemptions', { params });
  return { claims: res.data.data, meta: res.data.meta };
}

/** Every claim, not only the redeemed ones (§24 filters) - what is outstanding. */
export async function listAllClaims(
  params: ClaimListParams,
): Promise<{ claims: MerchantClaim[]; meta: PaginationMeta }> {
  const res = await apiClient.get<ApiListSuccess<MerchantClaim>>('/redemptions/claims', { params });
  return { claims: res.data.data, meta: res.data.meta };
}

/**
 * The verification trail for one claim (§30), rejections included - which is
 * the point. When a customer says their code was refused, this is the record
 * of what the till was told and why.
 */
export async function getClaimAudit(claimId: number, kind: ClaimKind): Promise<ClaimAudit> {
  const res = await apiClient.get<ApiSuccess<ClaimAudit>>(`/redemptions/claims/${claimId}/audit`, {
    params: { kind },
  });
  return res.data.data;
}

/**
 * Turns a failed verify or redeem into what the screen shows (§13-§15).
 *
 * The server's sentence is used verbatim and never replaced with one of ours:
 * it is deliberately identical for a code that does not exist and a code
 * belonging to another shop, and rewording either would give away which it
 * was. `details` only picks the heading and the icon beside it.
 *
 * A request that never reached the server has no sentence of its own, so it
 * falls through to `getApiErrorMessage` and lands on §36's offline wording or
 * §50's timeout wording rather than on "invalid code" - the one mistake this
 * screen must not make, because it would have the shopkeeper turn away a
 * customer holding a perfectly good coupon.
 */
export function toRejection(error: unknown, fallback: string): ClaimRejection {
  const message = getApiErrorMessage(error, fallback);
  if (!axios.isAxiosError(error)) return { message, reason: null, redeemedAt: null, unreachable: false };

  const details = (error.response?.data as ApiErrorBody | undefined)?.error?.details;
  const extra = details && !Array.isArray(details) ? (details as Record<string, unknown>) : undefined;

  return {
    message,
    reason: typeof extra?.reason === 'string' ? extra.reason : null,
    redeemedAt: typeof extra?.redeemedAt === 'string' ? extra.redeemedAt : null,
    unreachable: isNetworkError(error) || isTimeoutError(error),
  };
}
