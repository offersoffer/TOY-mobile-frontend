import type {
  AvailableDay,
  LocationSource,
  OpeningHours,
  BookingType,
  Offer,
  OfferDetail,
  OfferType,
  PricingType,
  ServiceDetail,
  ServiceOfferType,
  ShopBranch,
} from './models';

// ---- Offers (management) ---------------------------------------------------

export interface OfferFormValues {
  shopId: number;
  categoryId?: number | null;
  subcategoryId?: number | null;
  title: string;
  productName?: string;
  description?: string;
  offerText?: string;
  offerType: OfferType;
  discountType: 'percentage' | 'flat' | 'none';
  discountValue?: number | null;
  originalPrice?: number | null;
  discountedPrice?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  minPurchase?: number | null;
  termsConditions?: string;
  eligibility?: string;
  usageRestrictions?: string;
  applicableProducts?: string;
  isRecurring: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | null;
  startDate: string;
  endDate: string;
  status: 'draft' | 'scheduled' | 'active';
  applicabilityType: 'shop_wide' | 'selected_branches' | 'online';
  branchIds: number[];
  images: Array<{ url: string; thumbnailUrl?: string }>;
}

export type ManagedOffer = OfferDetail;
export type { Offer };

// ---- Shops / branches / members --------------------------------------------

export interface BranchFormValues {
  branchName: string;
  address?: string;
  addressLine2?: string;
  area?: string;
  city: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  /** Where the pin came from, so the API can record it (§24). */
  locationSource?: LocationSource | null;
  /** Metres of GPS uncertainty, when the device reported any (§25). */
  locationAccuracy?: number | null;
  placeId?: string | null;
  /** The merchant pressed "Confirm location" on the map (§8). */
  locationConfirmed?: boolean;
  openingHours?: OpeningHours | null;
  contactNumber?: string;
  /** The person a customer asks for here. Required to publish, not to save. */
  contactPersonName?: string;
  contactPersonEmail?: string;
  isPrimary?: boolean;
  status?: 'active' | 'inactive';
}

export interface ShopMember {
  id: number;
  shopId: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  userStatus: string;
  branchId: number | null;
  branchName: string | null;
  /**
   * Whether `branchId` confines this member or merely records where they
   * work. Attachment has scoped redemption since long before it meant
   * anything about permissions, so confinement is asked for explicitly.
   */
  branchRestricted: boolean;
  roleId: number | null;
  roleName: string | null;
  designation: string | null;
  status: string;
  createdAt: string;
}

export type { ShopBranch };

// ---- Banners (management) --------------------------------------------------

export type BannerStatus = 'draft' | 'scheduled' | 'published' | 'expired' | 'deactivated';

export interface BannerFormValues {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  desktopImageUrl?: string;
  offerId: number;
  buttonText?: string;
  startDate: string;
  endDate: string;
  status: BannerStatus;
  displayOrder?: number;
}

export interface AdminBanner {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  desktopImageUrl: string | null;
  buttonText: string;
  offerId: number;
  offerTitle: string;
  offerText: string | null;
  offerStatus: string;
  offerEndDate: string;
  offerImageUrl: string | null;
  shop: { id: number; name: string; slug: string; logoUrl: string | null };
  startDate: string;
  endDate: string;
  status: BannerStatus;
  displayOrder: number;
  isLive: boolean;
  impressionCount: number;
  clickCount: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Subscriptions / entitlements ------------------------------------------

export type PlanKey = 'FREE' | 'BUSINESS' | 'PREMIUM';

export interface PlanLimits {
  offersPerMonth: number | null;
  servicesPerMonth?: number | null;
  branches: number | null;
  categories: number | null;
  banners: number | null;
  exportsPerMonth: number | null;
}

export interface PlanCatalogueEntry {
  key: PlanKey;
  name: string;
  tagline: string;
  description: string;
  price: number;
  currency: string;
  rank: number;
  limits: PlanLimits;
  features: string[];
  profile: string;
  visibility: string;
}

export interface PlanCatalogueResponse {
  plans: PlanCatalogueEntry[];
  featureLabels: Record<string, string>;
  comparison: Array<{ label: string; values: [string | number, string | number, string | number] }>;
  /** Whether checkout can actually be opened, and with which gateway. */
  payment?: PaymentConfig;
}

export interface PaymentConfig {
  gateway: 'razorpay';
  enabled: boolean;
  keyId: string | null;
  supportsAutopay: boolean;
  methods: string[];
}

/** Subscription lifecycle states (payments spec §9). */
export type SubscriptionStatus =
  | 'created'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'expired';

/**
 * A feature the Super Admin granted independently of the plan (§11A).
 * Never created or modified from the app - it is read-only to a merchant.
 */
export interface FeatureOverride {
  id: number;
  shopId: number;
  shopName?: string | null;
  adminUserId?: number | null;
  adminName?: string | null;
  featureKey: string;
  featureName: string;
  category: string;
  kind: 'feature' | 'limit';
  status: 'active' | 'revoked' | 'expired';
  startsAt: string | null;
  expiresAt: string | null;
  isPermanent: boolean;
  reason: string | null;
  grantedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopEntitlements {
  shopId: number;
  plan: PlanKey;
  planName: string;
  tagline: string;
  price: number;
  currency: string;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'yearly';
  paymentStatus: string;
  startedAt: string | null;
  renewsAt: string | null;
  cancelledAt: string | null;
  limits: PlanLimits;
  /** Effective set: what the plan gives plus any Super Admin grants (§11K). */
  features: string[];
  /** What the plan alone gives, so the UI can say where access came from (§11G). */
  planFeatures?: string[];
  overrideFeatures?: string[];
  /** Active Super Admin grants with their expiry, for the §11N panel. */
  specialAccess?: FeatureOverride[];
  profile: string;
  visibility: string;
  // ---- Billing state (§14) ----
  gateway?: string | null;
  gatewaySubscriptionId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  nextBillingDate?: string | null;
  cancelAtPeriodEnd?: boolean;
  pendingPlan?: PlanKey | null;
  graceUntil?: string | null;
  autopayEnabled?: boolean;
  paymentMethod?: string | null;
  lastPaymentAt?: string | null;
  lastFailureReason?: string | null;
  /** True when the paid features are in force right now. */
  entitled?: boolean;
  /** Present on the cancel response: when the current benefits run out. */
  activeUntil?: string | null;
  usage: {
    period: string;
    offersThisMonth: number;
    servicesThisMonth?: number;
    branches: number;
    categories: number;
    banners: number;
    exportsThisMonth: number;
  };
  remaining: {
    offersThisMonth: number | null;
    servicesThisMonth?: number | null;
    branches: number | null;
    categories: number | null;
    banners: number | null;
  };
}

// ---- Payments (§3, §15, §16) -----------------------------------------------

/** Everything the app needs to open Razorpay Checkout for a plan purchase. */
export interface CheckoutSession {
  gateway: 'razorpay';
  keyId: string;
  subscriptionId: string;
  /** Razorpay's hosted checkout page - what the mobile app opens (§4). */
  shortUrl: string | null;
  status: string;
  plan: PlanKey;
  planName: string;
  amount: number;
  currency: string;
  recurring: boolean;
  previousPlan: PlanKey;
  prefill: { name: string | null; email: string | null; contact: string | null };
}

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED';

export interface PaymentTransaction {
  id: number;
  shopId: number;
  plan: PlanKey;
  planName: string;
  orderId: string | null;
  paymentId: string | null;
  amount: number;
  amountRefunded: number;
  currency: string;
  /** 'upi' | 'card' | 'netbanking' | 'wallet' - never a credential (§6). */
  paymentMethod: string | null;
  /** Safe descriptor Razorpay echoes back, e.g. "Visa ****4242". */
  methodDetail: string | null;
  status: PaymentStatus;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface SubscriptionInvoice {
  id: number;
  number: string;
  reference: string;
  plan: PlanKey;
  planName: string;
  description: string;
  periodStart: string | null;
  periodEnd: string | null;
  subtotal: number;
  taxAmount: number;
  taxPercent: number;
  amount: number;
  total: number;
  currency: string;
  status: 'issued' | 'paid' | 'void' | 'refunded';
  billingName: string | null;
  billingAddress: string | null;
  issuedAt: string;
}

export interface PlanUpgradeRequiredDetails {
  requiredPlan: PlanKey;
  requiredPlanName: string;
  requiredPlanPrice: number;
  feature?: string;
  limitKey?: string;
  used?: number;
  limit?: number;
  currentPlan: PlanKey;
}

// ---- Analytics ---------------------------------------------------------

export interface AnalyticsQuery {
  preset?: 'today' | 'yesterday' | 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth';
  shopId?: number;
  branchId?: number;
  categoryId?: number;
  limit?: number;
}

export interface OverviewAnalytics {
  offers: { total: number; active: number; scheduled: number; expired: number; draft: number; deactivated: number; expiringSoon: number };
  engagement: { views: number; clicks: number; favorites: number; claims: number; redemptions: number };
  shop?: { branches: number; members: number };
  /**
   * Set when the caller runs a single branch, saying which of these figures
   * are that branch's and which are the whole shop's.
   *
   * The offer counts are the branch's - the offers that run there. The
   * engagement counters are not: a shop-wide offer has one view count for the
   * whole shop, because nothing records a feed impression per branch.
   * Printing them as one branch's footfall would be a lie, so the server says
   * so and the dashboard repeats it.
   */
  branchScope: BranchScopeNote | null;
}

export interface BranchScopeNote {
  branches: { id: number; name: string }[];
  /** Which of the two is the branch's own. */
  offerSet: 'branch';
  counters: 'shop';
  note: string;
}

export interface AnalyticsRange {
  from: string;
  to: string;
  previousFrom?: string;
  previousTo?: string;
}

export interface KpiItem {
  key: string;
  label: string;
  value: number;
  previous: number | null;
  change: number | null;
  trend: 'up' | 'down' | 'flat';
  format: string;
  hint: string | null;
}

export interface AlertItem {
  key: string;
  icon: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
  message: string;
  entityId?: number;
}

export interface TimelinePoint {
  day: string;
  views: number;
  impressions: number;
  claims: number;
  redemptions: number;
  newCustomers: number;
}

export interface PremiumOverview {
  range: AnalyticsRange;
  kpis: KpiItem[];
  totals: Record<string, number>;
  previousTotals: Record<string, number>;
  timeline: TimelinePoint[];
  alerts: AlertItem[];
}

export interface OfferPerformanceRow {
  id: number;
  title: string;
  status: string;
  offerType: string;
  discountType: string;
  discountValue: number | null;
  category: string | null;
  shopName: string;
  startDate: string;
  endDate: string;
  impressions: number;
  views: number;
  clicks: number;
  shares: number;
  saves: number;
  claims: number;
  redemptions: number;
  rates: {
    impressionToView: number;
    viewToSave: number;
    viewToClaim: number;
    claimToRedemption: number;
    viewToRedemption: number;
    engagement: number;
  };
}

export interface OfferPerformanceAnalytics {
  range: AnalyticsRange;
  offers: OfferPerformanceRow[];
  totals: Record<string, number>;
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  from: string | null;
  conversion: number | null;
  dropOff: number | null;
  shareOfTop: number;
}

export interface FunnelAnalytics {
  range: AnalyticsRange;
  stages: FunnelStage[];
  totals: Record<string, number>;
  rates: Record<string, number>;
  biggestDropOff: { stage: string; label: string; conversion: number } | null;
}

export interface LocationRow {
  city: string;
  views: number;
  claims: number;
  redemptions: number;
  customers: number;
  conversion: number;
}

export interface LocationAnalytics {
  range: AnalyticsRange;
  locations: LocationRow[];
  branches: Array<{ id: number; branchName: string; city: string; latitude: number; longitude: number }>;
  highlights: { mostActive: LocationRow | null; highestConverting: LocationRow | null };
}

export interface BranchPerformanceRow {
  id: number;
  branchName: string;
  city: string;
  isPrimary: boolean;
  activeOffers: number;
  views: number;
  customers: number;
  claims: number;
  redemptions: number;
  conversion: number;
  topOffer: { id: number; title: string; views: number } | null;
}

export interface BranchPerformanceAnalytics {
  range: AnalyticsRange;
  branches: BranchPerformanceRow[];
  winners: { bestPerforming: BranchPerformanceRow | null; highestConversion: BranchPerformanceRow | null };
}

// ---- V4 — Services (management) --------------------------------------------

export interface ServiceFormValues {
  shopId: number;
  categoryId?: number | null;
  subcategoryId?: number | null;
  name: string;
  description?: string;
  pricingType: PricingType;
  price?: number | null;
  durationMinutes?: number | null;
  durationLabel?: string;
  availableDays: AvailableDay[];
  availableTimeStart?: string;
  availableTimeEnd?: string;
  homeService: boolean;
  walkInAvailable: boolean;
  appointmentRequired: boolean;
  bookingType: BookingType;
  serviceArea?: string;
  termsConditions?: string;
  applicabilityType: 'shop_wide' | 'selected_branches' | 'online';
  status: 'draft' | 'active';
  startDate?: string | null;
  endDate?: string | null;
  branchIds: number[];
  images: Array<{ url: string; thumbnailUrl?: string }>;
}

export type ManagedService = ServiceDetail;

export interface ServiceOfferFormValues {
  offerText?: string;
  offerType: ServiceOfferType;
  discountType: 'percentage' | 'flat' | 'none';
  discountValue?: number | null;
  originalPrice?: number | null;
  offerPrice?: number | null;
  termsConditions?: string;
  isRecurring: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | null;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active';
}

export type ServiceAnalyticsQuery = AnalyticsQuery & { serviceId?: number };

export interface ServiceAnalyticsOverview {
  range: AnalyticsRange;
  kpis: KpiItem[];
  totalServices: number;
  activeServices: number;
}

export interface ServiceTopPerformer {
  id: number;
  name: string;
  views: number;
  saves: number;
  bookings: number;
  claims: number;
  conversion: number | null;
}

export interface ServicePerformance {
  bestService: ServiceTopPerformer | null;
  mostViewedService: ServiceTopPerformer | null;
  mostSavedService: ServiceTopPerformer | null;
  mostBookedService: ServiceTopPerformer | null;
  mostClaimedService: ServiceTopPerformer | null;
  bestConvertingService: ServiceTopPerformer | null;
}

export interface ServiceFunnelStage {
  key: string;
  label: string;
  value: number;
  conversionFromPrevious: number | null;
}

export interface ServiceOfferPerformanceSplit {
  promotional: { views: number };
  normal: { views: number };
}

export interface ServiceBranchRow {
  id: number;
  branchName: string;
  city: string | null;
  views: number;
  bookings: number;
  claims: number;
}

export interface ServiceLocationRow {
  city: string;
  views: number;
  bookings: number;
}

export interface ServiceCustomerInsights {
  newCustomers: number;
  customerGrowth: number | null;
  repeatBookings: number;
  repeatClaims: number;
}

export interface ServiceCategoryInsightRow {
  id: number;
  name: string;
  serviceCount: number;
  views: number;
  saves: number;
}

// ---- Claim verification & redemption (Claim/Redemption §7-§11, §24) --------

/**
 * Which kind of coupon a claim belongs to (§22).
 *
 * Product-offer and service-offer claims live in separate tables with separate
 * id sequences, so every merchant call that names a claim by id has to say
 * which of the two it means. The verify screen never asks - a shopkeeper
 * holding a code has no idea which sort it is, and the server searches both -
 * but the history lists report one kind at a time.
 */
export type ClaimKind = 'offer' | 'service_offer';

/** How the code reached the till (§30). Recorded on the redemption. */
export type VerificationMethod = 'QR_SCAN' | 'CODE_ENTRY';

/**
 * A claim as the *merchant* is allowed to see it.
 *
 * Deliberately not the customer `Claim` from `models.ts`: this carries the
 * customer's name and who redeemed it, and carries no `qrValue` - the merchant
 * audience never receives one, because a shop that could re-render a customer's
 * QR could redeem on their behalf.
 */
export interface MerchantClaim {
  id: number;
  kind: ClaimKind;
  code: string;
  status: 'claimed' | 'redeemed' | 'expired' | 'cancelled' | 'revoked';
  claimedAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  redemptionCount: number;
  maxRedemptions: number;
  verificationMethod: VerificationMethod | null;
  offer: { id: number; title: string; offerText: string | null; endDate: string; imageUrl: string | null };
  shop: { id: number; name: string };
  branch: { id: number; name: string } | null;
  customer: { id: number; name: string };
  redeemedBy: { id: number; name: string } | null;
}

/**
 * What `POST /redemptions/verify` answers with: the claim, plus the two things
 * the till needs that are not properties of the claim itself.
 */
export interface ClaimVerification extends MerchantClaim {
  /** §10's "READY TO REDEEM". Verifying never redeems, so the screen is told. */
  verdict: 'READY_TO_REDEEM';
  /** Whether *this* member of staff may press Confirm, for *this* shop. */
  canRedeem: boolean;
  branchId: number | null;
}

/**
 * Why a code was refused (§13-§15).
 *
 * `message` is the server's sentence and is what gets shown; the reason only
 * chooses a heading and an icon. A code for another shop deliberately arrives
 * as a plain not-found with no reason at all, so the verify screen cannot be
 * used to ask whether a code is live somewhere else.
 */
export interface ClaimRejection {
  message: string;
  reason: string | null;
  redeemedAt: string | null;
  /**
   * The request never got an answer - no signal at the back of the shop, or a
   * timeout. Kept apart from every other refusal because the coupon in the
   * customer's hand may well be valid, and a screen that said "invalid code"
   * here would have the shopkeeper turn them away over a dead connection.
   */
  unreachable: boolean;
}

/** Today's Activity for the merchant dashboard (§35) and the §20 conversion. */
export interface RedemptionSummary {
  claimsToday: number;
  redemptionsToday: number;
  pending: number;
  claimsTotal: number;
  redemptionsTotal: number;
  /**
   * Null, not zero, when nothing has been claimed yet - §20 - and also null
   * for a branch admin, whose claims and redemptions are not counted the same
   * way. A redemption happened at one branch and says so; a claim not yet
   * redeemed happened at none, so it counts at every branch that could honour
   * it. The server withholds the ratio rather than report one that falls as a
   * shop opens more branches.
   */
  claimToRedemption: number | null;
  /** True when these counters cover one branch rather than the whole shop. */
  branchScoped: boolean;
}

/** How many wrong codes this account may still try before §28 locks it out. */
export interface ClaimAttemptBudget {
  remaining: number;
  limit: number;
  windowMinutes: number;
}

/** One entry in a claim's verification trail (§30). */
export interface ClaimAuditEvent {
  id: number;
  action: 'VERIFIED' | 'REDEEMED' | 'REJECTED' | 'REVOKED';
  reason: string | null;
  method: VerificationMethod | null;
  at: string;
  branch: { id: number; name: string } | null;
  actor: { id: number; name: string } | null;
}

export interface ClaimAudit {
  claim: MerchantClaim;
  events: ClaimAuditEvent[];
}
