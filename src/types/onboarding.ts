import type { LocationSource } from './models';

/**
 * Self-service seller registration (Self-Service Onboarding §4-§12).
 *
 * Mirrors `TOY-frontend/src/app/core/onboarding.service.ts` field for field.
 * §23 asks for the two clients to behave identically, and the surest way to
 * get that is for both to read the same shapes from the same endpoints.
 */

/** §7's three UI states, decided by the backend so no client can disagree. */
export type LocationState = 'NOT_SELECTED' | 'PIN_SELECTED_NOT_CONFIRMED' | 'CONFIRMED';

export type VerificationStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'ADDITIONAL_INFO_REQUIRED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface RegistrationAddress {
  branchId: number;
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
  locationState: LocationState;
  locationConfirmedAt: string | null;
}

export interface Registration {
  shopId: number;
  slug: string;
  name: string;
  description: string | null;
  contactNumber: string | null;
  email: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  categoryIds: number[];
  registrationSource: string | null;
  verificationStatus: VerificationStatus;
  submittedAt: string | null;
  decidedAt: string | null;
  /** Shown to the seller verbatim when more information is needed (§12). */
  decisionReason: string | null;
  canEdit: boolean;
  canSubmit: boolean;
  isPublic: boolean;
  address: RegistrationAddress | null;
}

export interface AddressPayload {
  address?: string | null;
  addressLine2?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationSource?: LocationSource | null;
  locationAccuracy?: number | null;
  /** Set only when the seller pressed Confirm location (§7). */
  locationConfirmed?: boolean;
}

/** §8. All optional - plenty of small businesses have none of these. */
export interface VerificationPayload {
  gstin?: string | null;
  googleBusinessUrl?: string | null;
  businessRegistrationNumber?: string | null;
  note?: string | null;
}

export interface RegistrationPayload {
  name?: string;
  description?: string;
  contactNumber?: string;
  email?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  categoryIds?: number[];
  address?: AddressPayload;
  verification?: VerificationPayload;
}

/** A shop we already have that might be the one this seller is registering (§16). */
export interface DuplicateCandidate {
  shopId: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  area: string | null;
  city: string | null;
  pincode: string | null;
  categories: string[];
  /** Why we think it might be theirs, in words the seller can read. */
  matchedOn: string[];
  alreadyYours: boolean;
  claimPending: boolean;
}

/**
 * Named `ShopClaimStatus` rather than `ClaimStatus`: an offer claim is
 * already a thing in this app, and two unrelated `ClaimStatus` types would
 * collide in the barrel and read as the same concept in every import.
 */
export type ShopClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface ShopClaim {
  id: number;
  shopId: number;
  shopName: string;
  shopSlug: string;
  reason: string;
  contactPhone: string | null;
  status: ShopClaimStatus;
  /** Set by a reviewer on rejection, and shown to the requester verbatim. */
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
}
