export const queryKeys = {
  offers: (params: unknown) => ['offers', params] as const,
  offer: (id: number) => ['offer', id] as const,
  offerReviews: (id: number) => ['offerReviews', id] as const,
  shops: (params: unknown) => ['shops', params] as const,
  shop: (idOrSlug: number | string) => ['shop', idOrSlug] as const,
  shopBranches: (idOrSlug: number | string) => ['shopBranches', idOrSlug] as const,
  categories: (params: unknown) => ['categories', params] as const,
  featuredBanners: () => ['featuredBanners'] as const,
  endingSoon: (params: unknown) => ['endingSoon', params] as const,
  nearby: (params: unknown) => ['nearby', params] as const,
  recommended: (params: unknown) => ['recommended', params] as const,
  favorites: (params: unknown) => ['favorites', params] as const,
  followedShops: () => ['followedShops'] as const,
  followedCategories: () => ['followedCategories'] as const,
  notifications: (params: unknown) => ['notifications', params] as const,
  notificationPreferences: () => ['notificationPreferences'] as const,
  claims: (params: unknown) => ['claims', params] as const,
  services: (params: unknown) => ['services', params] as const,
  service: (id: number) => ['service', id] as const,
  savedServices: (params: unknown) => ['savedServices', params] as const,
  unifiedOffers: (params: unknown) => ['unifiedOffers', params] as const,
  nearbyListings: (params: unknown) => ['nearbyListings', params] as const,
  mySupportTickets: (params: unknown) => ['mySupportTickets', params] as const,
  supportTicket: (id: number) => ['supportTicket', id] as const,
  supportContact: () => ['supportContact'] as const,

  // ---- Shop Admin: claim verification & redemption (§24, §30) ----
  // The shared 'redemptions' and 'redemptionSummary' prefixes are what a
  // confirmed redemption invalidates, so both lists and the counters refresh
  // from one mutation without naming every filter combination in use.
  redemptionSummary: (shopId: number | null) => ['redemptionSummary', shopId] as const,
  redemptions: (params: unknown) => ['redemptions', params] as const,
  merchantClaims: (params: unknown) => ['redemptions', 'claims', params] as const,
  claimAudit: (claimId: number, kind: string) => ['claimAudit', claimId, kind] as const,

  // ---- Visibility & Promotion System ----
  rankedFeed: (params: unknown) => ['rankedFeed', params] as const,
  rankedNearMe: (params: unknown) => ['rankedNearMe', params] as const,
  rankedSearch: (params: unknown) => ['rankedSearch', params] as const,
  rankedCategory: (params: unknown) => ['rankedCategory', params] as const,
  rankedEndingSoon: (params: unknown) => ['rankedEndingSoon', params] as const,
  placements: (params: unknown) => ['placements', params] as const,
  visibilityMeta: () => ['visibilityMeta'] as const,
};
