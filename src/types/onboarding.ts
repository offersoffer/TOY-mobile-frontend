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
