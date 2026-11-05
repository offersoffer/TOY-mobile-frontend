import type { VerificationStatus } from './onboarding';

export interface PreferredLocation {
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface UserShopMembership {
  shopId: number;
  shopName: string;
  shopSlug: string;
  shopLogoUrl: string | null;
  branchId: number | null;
  designation: string | null;
  roleName: string | null;
  permissions: string[];
  /** Where this shop sits in review, or null if it never went through it. */
  verificationStatus: VerificationStatus | null;
  /**
   * True while a registration is still waiting on its first decision (§12).
   *
   * The seller holds ADMIN on their own registration from the moment the
   * draft exists, so this - not the permission list - is what tells a
   * registration in flight from a shop to run.
   */
  awaitingFirstApproval: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive';
  emailVerified: boolean;
  avatarUrl: string | null;
  preferencesCompleted: boolean;
  minimumDiscountPercent: number | null;
  preferredLocation: PreferredLocation | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  canAccessAdmin: boolean;
  unassignedShopRoles: unknown[];
  shops: UserShopMembership[];
  unreadNotifications?: number;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  /** Seconds until the refresh token expires - the real "stay logged in" window. */
  refreshExpiresIn?: number;
  /** Identifies this device's session family, for the session list (§27). */
  familyId?: string;
}

/**
 * One signed-in device (§28). The id is the refresh-token family, so
 * revoking it ends that device's session without touching the others.
 */
export interface DeviceSession {
  id: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'web' | 'unknown';
  deviceName: string | null;
  platform: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  /** True for the session making the request - never offered for revoke. */
  current: boolean;
}

export type OfferType = 'percentage' | 'flat' | 'buy_x_get_y' | 'price_drop' | 'up_to' | 'other';
export type OfferStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'deactivated';

export interface OfferShopSummary {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface OfferCategorySummary {
  id: number;
  name: string;
  slug: string;
}

export interface Offer {
  id: number;
  title: string;
  productName: string | null;
  description: string | null;
  offerText: string | null;
  offerType: OfferType;
  discountType: 'percentage' | 'flat' | 'none';
  discountValue: number | null;
  originalPrice: number | null;
  discountedPrice: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  minPurchase: number | null;
  termsConditions: string | null;
  eligibility: string | null;
  usageRestrictions: string | null;
  applicableProducts: string | null;
  isRecurring: boolean;
  recurrenceType: 'daily' | 'weekly' | 'monthly' | null;
  startDate: string;
  endDate: string;
  status: OfferStatus;
  applicabilityType: 'shop_wide' | 'selected_branches' | 'online';
  imageUrl: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  clickCount: number;
  favoriteCount: number;
  distanceKm: number | null;
  locationLabel: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  shop: OfferShopSummary;
  category: OfferCategorySummary | null;
  // Discovery-endpoint extras
  endingBucket?: { key: 'urgent' | 'today' | 'tomorrow' | 'three-days' | 'soon'; label: string };
  score?: number;
  reason?: string;
}

export interface OfferImage {
  id: number;
  url: string;
  thumbnailUrl: string | null;
  displayOrder: number;
}

export interface OfferBranch {
  id: number;
  branchName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  contactNumber: string | null;
  isPrimary: boolean;
  distanceKm: number | null;
}

export interface OfferDetail extends Offer {
  subcategory: { id: number; name: string } | null;
  images: OfferImage[];
  branches: OfferBranch[];
  branchIds: number[];
  shop: OfferShopSummary & { description: string | null; contactNumber: string | null };
  rating: { count: number; average: number | null };
}

export interface Shop {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  contactNumber: string | null;
  email: string | null;
  websiteUrl: string | null;
  socialLinks: Record<string, string> | null;
  openingHours: OpeningHours | null;
  status: 'active' | 'inactive';
  branchCount?: number;
  activeOfferCount?: number;
  followerCount?: number;
  isFollowing?: boolean;
  distanceKm: number | null;
  city: string | null;
  categories: OfferCategorySummary[];
  createdAt: string;
  updatedAt: string;
}

/** Where a shop's map pin came from (V3 shop-location spec §24). */
export type LocationSource = 'ADDRESS_SEARCH' | 'MAP_PIN' | 'CURRENT_LOCATION' | 'MANUAL';

/** A day is either shut or a list of open/close windows (§3). */
export type OpeningHours = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', 'closed' | Array<{ open: string; close: string }>>
>;

export interface ShopBranch {
  id: number;
  shopId: number;
  branchName: string;
  address: string | null;
  addressLine2: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: LocationSource | null;
  locationAccuracy: number | null;
  locationConfirmedAt: string | null;
  placeId: string | null;
  openingHours: OpeningHours | null;
  contactNumber: string | null;
  isPrimary: boolean;
  status: 'active' | 'inactive';
  offerCount?: number;
  distanceKm: number | null;
  createdAt: string;
  updatedAt: string;
}

/** A geocoder answer, from `/geo/search` and `/geo/reverse`. */
export interface GeoPlace {
  latitude: number;
  longitude: number;
  label: string | null;
  placeId: string | null;
  address: {
    addressLine1: string | null;
    area: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    pincode: string | null;
  };
}

/** One row of the §17 profile-completion checklist. */
export interface ProfileChecklistItem {
  key: string;
  label: string;
  required: boolean;
  done: boolean;
}

/** §17's progress bar plus the §18 publish verdict. Shop staff only. */
export interface ShopProfileStatus {
  percent: number;
  canPublish: boolean;
  missingRequired: string[];
  items: ProfileChecklistItem[];
}

export interface ShopDetail extends Shop {
  branches: ShopBranch[];
  rating: { count: number; average: number | null };
  /** Present only for someone who can edit the shop. */
  profile?: ShopProfileStatus;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  parentId: number | null;
  status: 'active' | 'inactive';
  offerCount?: number;
  shopCount?: number;
  isFollowing?: boolean;
  createdAt: string;
}

export interface Banner {
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
  shop: OfferShopSummary;
  startDate: string;
  endDate: string;
  status: string;
  displayOrder: number;
  isLive: boolean;
  impressionCount: number;
  clickCount: number;
}

export type ClaimStatus = 'claimed' | 'redeemed' | 'expired' | 'cancelled';

export interface Claim {
  id: number;
  code: string;
  status: ClaimStatus;
  claimedAt: string;
  redeemedAt: string | null;
  offer: { id: number; title: string; offerText: string | null; endDate: string; imageUrl: string | null };
  shop: { id: number; name: string };
  branch: { id: number; name: string } | null;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: number | null;
  /**
   * `offersapp://...` destination decided by the backend when the notification
   * was created (Push §26). Preferred over re-deriving a screen from
   * `entityType`, so a notification from months ago still opens what it named.
   * Null on rows created before push shipped.
   */
  deepLink: string | null;
  pushState: 'none' | 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled' | 'expired';
  isRead: boolean;
  /** Set when the customer tapped through, rather than merely seeing the row. */
  openedAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  /**
   * Master switch for device push. Off still records notifications in the
   * in-app centre - it only stops them reaching the lock screen (Push §29).
   */
  pushEnabled: boolean;
  followedShopOffers: boolean;
  followedCategoryOffers: boolean;
  nearbyOffers: boolean;
  favoriteExpiring: boolean;
  offerUpdates: boolean;
  claimUpdates: boolean;
  redemptionUpdates: boolean;
  bookingUpdates: boolean;
  adminAnnouncements: boolean;
  savedServiceOfferExpiring: boolean;
}

/** A device registered to receive push for the signed-in account (Push §37). */
export interface PushDevice {
  id: number;
  platform: string | null;
  deviceName: string | null;
  transport: 'expo' | 'fcm' | 'apns';
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface Review {
  id: number;
  offerId: number | null;
  shopId: number | null;
  rating: number;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  user: { id: number; name: string; avatarUrl: string | null };
  offerTitle?: string;
  shopName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  url: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  bytes: number;
}

export type ClientAnalyticsEvent =
  | 'OFFER_IMPRESSION'
  | 'SEARCH'
  | 'CATEGORY_VIEW'
  | 'SHOP_VIEW'
  | 'LOCATION_SEARCH'
  | 'NEARBY_OFFER_VIEW'
  | 'BANNER_IMPRESSION'
  // V2 personalization — mirrors backend CLIENT_EVENT_TYPES additions exactly.
  | 'PREFERENCE_ONBOARDING_STARTED'
  | 'PREFERENCE_CATEGORY_SELECTED'
  | 'PREFERENCE_SHOP_SELECTED'
  | 'PREFERENCE_DISCOUNT_SELECTED'
  | 'PREFERENCE_OFFER_TYPE_SELECTED'
  | 'PERSONALIZED_OFFER_IMPRESSION'
  | 'RECOMMENDATION_CLICK'
  | 'RECOMMENDATION_DISMISS';

// Mirrors backend/src/modules/preferences/preferences.constants.js exactly —
// not the same vocabulary as Offer['offerType'], see that file's comment.
export type OfferTypePreference =
  | 'PERCENTAGE_DISCOUNT'
  | 'BUY_ONE_GET_ONE'
  | 'BUY_TWO_GET_ONE'
  | 'FLAT_DISCOUNT'
  | 'CASHBACK'
  | 'FREE_ITEM'
  | 'COMBO_OFFER'
  | 'CLEARANCE_SALE'
  | 'APP_EXCLUSIVE';

export interface CustomerPreferences {
  preferencesCompleted: boolean;
  categoryIds: number[];
  shopIds: number[];
  minimumDiscountPercent: number | null;
  offerTypes: OfferTypePreference[];
}

export interface FollowedShop {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  activeOfferCount: number;
  followedAt: string;
}

export interface FollowedCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  activeOfferCount: number;
  followedAt: string;
}

// ---- V4 — Services -----------------------------------------------------

export type PricingType = 'fixed' | 'starting_from' | 'price_on_enquiry';
export type BookingType = 'walk_in' | 'appointment' | 'both' | 'enquiry_only';
export type ServiceStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'deactivated';
export type ServiceOfferStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'deactivated';
export type AvailableDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type ServiceSort = 'newest' | 'mostViewed' | 'mostPopular' | 'nearest';
export type ServiceOfferType = 'percentage' | 'flat' | 'price_drop' | 'other';

export interface ServiceActiveOffer {
  id: number;
  offerText: string | null;
  discountType: 'percentage' | 'flat' | 'none';
  discountValue: number | null;
  offerPrice: number | null;
  endDate: string;
}

export interface Service {
  id: number;
  name: string;
  description: string | null;
  pricingType: PricingType;
  price: number | null;
  durationMinutes: number | null;
  durationLabel: string | null;
  availableDays: AvailableDay[];
  availableTimeStart: string | null;
  availableTimeEnd: string | null;
  homeService: boolean;
  walkInAvailable: boolean;
  appointmentRequired: boolean;
  bookingType: BookingType;
  serviceArea: string | null;
  termsConditions: string | null;
  applicabilityType: 'shop_wide' | 'selected_branches' | 'online';
  status: ServiceStatus;
  startDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  clickCount: number;
  saveCount: number;
  distanceKm: number | null;
  locationLabel: string | null;
  isSaved: boolean;
  activeOffer?: ServiceActiveOffer | null;
  createdAt: string;
  updatedAt: string;
  shop: OfferShopSummary & { description?: string | null; contactNumber?: string | null };
  category: OfferCategorySummary | null;
  subcategory?: { id: number; name: string } | null;
}

export interface ServiceDetail extends Service {
  images: OfferImage[];
  branches: OfferBranch[];
  branchIds: number[];
}

export interface ServiceOffer {
  id: number;
  serviceId: number;
  offerText: string | null;
  offerType: ServiceOfferType;
  discountType: 'percentage' | 'flat' | 'none';
  discountValue: number | null;
  originalPrice: number | null;
  offerPrice: number | null;
  termsConditions: string | null;
  isRecurring: boolean;
  recurrenceType: 'daily' | 'weekly' | 'monthly' | null;
  startDate: string;
  endDate: string;
  status: ServiceOfferStatus;
  viewCount: number;
  claimCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOfferClaim {
  id: number;
  code: string;
  status: 'claimed' | 'redeemed' | 'expired' | 'cancelled';
  claimedAt: string;
  redeemedAt: string | null;
  serviceOffer: { id: number; offerText: string | null; endDate: string };
  service: { id: number; name: string };
  shop: { id: number; name: string };
  branch: { id: number; name: string } | null;
}

export interface ServiceBooking {
  id: number;
  serviceId: number;
  userId: number;
  branchId: number | null;
  serviceOfferId: number | null;
  requestedAt: string | null;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedListing {
  id: number;
  sourceType: 'product' | 'service';
  serviceId: number | null;
  title: string;
  offerText: string | null;
  discountType: 'percentage' | 'flat' | 'none';
  discountValue: number | null;
  originalPrice: number | null;
  finalPrice: number | null;
  startDate: string;
  endDate: string;
  status: string;
  imageUrl: string | null;
  distanceKm: number | null;
  isSaved: boolean;
  latitude?: number | null;
  longitude?: number | null;
  shop: { id: number; name: string; slug: string; logoUrl: string | null };
  category: { id: number; name: string; slug: string } | null;
}

// ---- Support ----------------------------------------------------------------

export type SupportStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';
export type SupportPriority = 'low' | 'normal' | 'high';
export type SupportUserType = 'customer' | 'merchant' | 'guest';
/** What a content report can be filed against. Mirrors the API's `REPORTABLE`. */
export type ReportableEntity = 'offer' | 'service' | 'shop' | 'service_offer';

export interface SupportMessage {
  id: number;
  authorRole: 'customer' | 'support';
  /** Null for a message left by a guest, who has no account to name. */
  authorName: string | null;
  body: string;
  /** Always false in a customer's copy — the API strips internal notes. */
  isInternal: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  /** "SUP-10248". What a customer quotes; it authorises nothing. */
  reference: string;
  userId: number | null;
  name: string;
  email: string;
  phone: string | null;
  userType: SupportUserType;
  category: string;
  subject: string;
  description: string;
  attachmentUrl: string | null;
  entityType: string | null;
  entityId: number | null;
  status: SupportStatus;
  priority: SupportPriority;
  assignedTo: number | null;
  assigneeName: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present only on the single-ticket read, not in a list. */
  messages?: SupportMessage[];
}

export interface SupportTicketPayload {
  name: string;
  email: string;
  phone?: string | null;
  userType: SupportUserType;
  category: string;
  subject: string;
  description: string;
  attachmentUrl?: string | null;
  entityType?: ReportableEntity | null;
  entityId?: number | null;
}

/** Published contact details, so a number can change without a store release. */
export interface SupportContact {
  email: string;
  phones: string[];
  categories: string[];
}

// ---- Visibility & Promotion System -----------------------------------------
//
// Mirrors `src/config/visibility.js` and the customer half of the `/visibility`
// API. Only the customer-facing vocabulary lives here: the merchant and Super
// Admin shapes belong to the web admin, and duplicating them would be three
// copies of the same contract to keep honest.

export type VisibilitySurface = 'SEARCH' | 'NEAR_ME' | 'HOME' | 'CATEGORY' | 'ENDING_SOON';

export type PlacementType =
  | 'HOME_FEATURED'
  | 'CATEGORY_FEATURED'
  | 'NEAR_ME_FEATURED'
  | 'SEASONAL_CAMPAIGN'
  | 'ENDING_SOON_FEATURED';

export type VisibilityListingType = 'offer' | 'service_offer' | 'shop';

/**
 * Events the client is allowed to post (§32).
 *
 * SAVE, CLAIM and REDEMPTION are absent on purpose: §2.4 makes a verified
 * redemption the strongest ranking signal on the platform, so it is only ever
 * written server-side by the flow that performs it. A client that could post
 * one could rank itself.
 */
export type ClientVisibilityEvent =
  | 'IMPRESSION'
  | 'VIEW'
  | 'SEARCH_CLICK'
  | 'PROFILE_VIEW'
  | 'DIRECTIONS_CLICK'
  | 'FEATURED_IMPRESSION'
  | 'FEATURED_CLICK';

/**
 * One promoted card (§7, §11).
 *
 * Carries its campaign and slot so the client can label it as promotional -
 * §11 requires featured content to be clearly distinguishable from organic
 * results, and a card that does not know it is promoted cannot say so.
 */
export interface FeaturedPlacement {
  featured: true;
  placementType: PlacementType;
  slotId: number;
  slotCode: string;
  featuredCampaignId: number;
  campaignName: string;
  promotionalMessage: string | null;
  listingType: VisibilityListingType;
  id: number;
  headline: string;
  imageUrl: string | null;
  categoryId: number | null;
  shop: { id: number; name: string; slug: string; logoUrl: string | null };
  startsAt: string;
  endsAt: string;
}

/** A ranked organic listing. Shaped like `UnifiedListing`, with its own type tag. */
export interface RankedListing {
  id: number;
  listingType: VisibilityListingType;
  serviceId: number | null;
  title: string;
  offerText: string | null;
  discountType: 'percentage' | 'flat' | 'none';
  discountValue: number | null;
  originalPrice: number | null;
  finalPrice: number | null;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  distanceKm: number | null;
  latitude: number | null;
  longitude: number | null;
  isSaved: boolean;
  featured: false;
  shop: { id: number; name: string; slug: string; logoUrl: string | null };
  category: { id: number; name: string; slug: string } | null;
  /** Present only on the Ending Soon surface (§12). */
  endingBucket?: { key: string; label: string };
}

export interface VisibilityFeed {
  featured: FeaturedPlacement[];
  items: RankedListing[];
}

/** §21's wording, served by the API so no screen composes its own promise. */
export interface VisibilityPromise {
  headline: string;
  explanation: string;
  disclaimer: string;
}

export interface VisibilityMeta {
  events: { all: string[]; client: ClientVisibilityEvent[] };
  surfaces: VisibilitySurface[];
  placementTypes: PlacementType[];
  visibilityLevels: { key: string; rank: number; label: string }[];
  promise: VisibilityPromise;
  defaultRadiusKm: number;
}
