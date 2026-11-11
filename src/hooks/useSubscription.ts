import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as subscriptionsApi from '../api/subscriptions';
import * as authApi from '../api/auth';
import type { PlanKey } from '../types/admin';

const shopKey = (shopId: number | null) => ['shopEntitlements', shopId] as const;

export function usePlanCatalogue() {
  return useQuery({
    queryKey: ['planCatalogue'],
    queryFn: subscriptionsApi.getPlanCatalogue,
    staleTime: 10 * 60 * 1000,
  });
}

export function useShopEntitlements(shopId: number | null) {
  return useQuery({
    queryKey: shopKey(shopId),
    queryFn: () => subscriptionsApi.getShopEntitlements(shopId as number),
    enabled: shopId != null,
  });
}

/**
 * Opens Razorpay Checkout for a paid plan (§3).
 *
 * Success here means "the gateway has the payment", not "the plan is live":
 * the backend activates the plan from the webhook (§7), so callers should
 * re-read entitlements rather than assume an upgrade.
 */
export function useDowngrade(shopId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { plan: PlanKey; note?: string }) =>
      subscriptionsApi.downgrade(shopId as number, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopKey(shopId) }),
  });
}

export function useCancelSubscription(shopId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => subscriptionsApi.cancelSubscription(shopId as number, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopKey(shopId) }),
  });
}

export function useBillingHistory(shopId: number | null) {
  return useQuery({
    queryKey: ['billingHistory', shopId],
    queryFn: () => subscriptionsApi.getBillingHistory(shopId as number),
    enabled: shopId != null,
  });
}

export function useInvoices(shopId: number | null) {
  return useQuery({
    queryKey: ['invoices', shopId],
    queryFn: () => subscriptionsApi.getInvoices(shopId as number),
    enabled: shopId != null,
  });
}

// ---- Device sessions (§28) --------------------------------------------------

export function useSessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: authApi.fetchSessions });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.revokeOtherSessions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
