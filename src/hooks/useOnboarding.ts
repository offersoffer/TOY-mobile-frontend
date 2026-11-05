import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as onboardingApi from '../api/onboarding';
import type { Registration, RegistrationPayload } from '../types';

/**
 * Self-service seller registration (Self-Service Onboarding §4).
 *
 * Only the list is cached. Each save returns the whole registration, so the
 * mutations write the answer straight into the cache rather than invalidating
 * and refetching - a seller on a 3G connection in a shop should not pay for a
 * second round trip to see the step they just saved.
 */

const KEY = ['myRegistrations'] as const;

/** Everything this seller has in flight; drives the resume (§4). */
export function useMyRegistrations(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: onboardingApi.mine,
    enabled,
    // The seller is the only person who edits these, so refetching on every
    // screen focus would just cost them data.
    staleTime: 60 * 1000,
  });
}

function useCacheWriter() {
  const queryClient = useQueryClient();
  return (saved: Registration) => {
    queryClient.setQueryData<Registration[]>(KEY, (current) => {
      const list = current ?? [];
      const index = list.findIndex((item) => item.shopId === saved.shopId);
      if (index === -1) return [saved, ...list];
      const next = [...list];
      next[index] = saved;
      return next;
    });
  };
}

export function useStartRegistration() {
  const write = useCacheWriter();
  return useMutation({
    mutationFn: (payload: RegistrationPayload) => onboardingApi.start(payload),
    onSuccess: write,
  });
}

export function useSaveRegistration(shopId: number | null) {
  const write = useCacheWriter();
  return useMutation({
    mutationFn: (payload: RegistrationPayload) => onboardingApi.save(shopId as number, payload),
    onSuccess: write,
  });
}

export function useSubmitRegistration(shopId: number | null) {
  const write = useCacheWriter();
  return useMutation({
    mutationFn: () => onboardingApi.submit(shopId as number),
    onSuccess: write,
  });
}
