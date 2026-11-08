import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as redemptionsApi from '../api/redemptions';
import { queryKeys } from '../api/queryKeys';
import type { ClaimKind } from '../types/admin';

/**
 * Shop Admin claim verification and redemption history (§7-§11, §24).
 *
 * The verify and redeem mutations are deliberately not cached or retried.
 * Retrying a redeem would be a second attempt to hand over a benefit, and the
 * server answers the duplicate with §15's "already redeemed" - correct, but it
 * would reach the till as a refusal for a redemption that in fact succeeded.
 */

export function useRedemptionSummary(shopId?: number) {
  return useQuery({
    queryKey: queryKeys.redemptionSummary(shopId ?? null),
    queryFn: () => redemptionsApi.getRedemptionSummary(shopId),
    enabled: !!shopId,
  });
}

export function useVerifyClaim() {
  return useMutation({
    mutationFn: (payload: redemptionsApi.VerifyPayload) => redemptionsApi.verifyClaim(payload),
    retry: false,
  });
}

export function useRedeemClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: redemptionsApi.VerifyPayload) => redemptionsApi.redeemClaim(payload),
    retry: false,
    // A redemption is the one event in the funnel that says a customer walked
    // in (§18/§19), so it moves the dashboard counters as well as the history.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['redemptionSummary'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsOverview'] });
    },
  });
}

export function useRejectClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, reason }: { code: string; reason: string }) =>
      redemptionsApi.rejectClaim(code, reason),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['redemptionSummary'] }),
  });
}

interface HistoryParams {
  kind: ClaimKind;
  shopId?: number;
  search?: string;
  status?: redemptionsApi.ClaimListParams['status'];
}

/**
 * `enabled` is separate from the params on purpose. The history screen keeps
 * both lists mounted and only runs the visible one, and folding that into the
 * params - blanking the shop id on the hidden list, say - would change its
 * query key, so returning to a tab would miss the cache it had just filled.
 */

/** The redeemed list (§24). */
export function useRedemptionHistory(params: HistoryParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.redemptions(params),
    queryFn: ({ pageParam }) => redemptionsApi.listRedemptions({ ...params, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
    enabled: enabled && !!params.shopId,
  });
}

/** Every claim, including what is still outstanding (§24). */
export function useClaimsConsole(params: HistoryParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.merchantClaims(params),
    queryFn: ({ pageParam }) => redemptionsApi.listAllClaims({ ...params, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
    enabled: enabled && !!params.shopId,
  });
}

/** The trail for one claim (§30). Only fetched once a row is opened. */
export function useClaimAudit(claimId: number | null, kind: ClaimKind) {
  return useQuery({
    queryKey: queryKeys.claimAudit(claimId ?? 0, kind),
    queryFn: () => redemptionsApi.getClaimAudit(claimId as number, kind),
    enabled: claimId !== null,
  });
}
