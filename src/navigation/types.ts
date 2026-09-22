import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
};

export type MainTabParamList = {
  Offers: undefined;
  Services: undefined;
  NearMe: undefined;
  Saved: undefined;
  Profile: undefined;
};

/**
 * Company, support and legal — the five screens that belong to both apps.
 *
 * A customer reaches them under Profile; a merchant reaches the same five from
 * the Shop Admin profile, because "Subscription / Billing" and "Merchant /
 * Shop Account" are support categories and a merchant is a user too. Written
 * once and spread into both stacks so the two can never drift apart.
 */
export type SupportStackParamList = {
  About: undefined;
  Contact: undefined;
  /**
   * `report`/`entityId` arrive from the "Report this…" row on an offer,
   * service or shop, and open the form on the report category with the listing
   * already attached.
   */
  HelpSupport: { report?: import('../types').ReportableEntity; entityId?: number } | undefined;
  MySupportRequests: undefined;
  Legal: { document: 'privacy' | 'terms' };
};

export type RootStackParamList = SupportStackParamList & {
  MainTabs: undefined;
  // Guest browsing §19/§21: a guest is already inside the app, so the auth
  // screens have to be reachable from it rather than only before it.
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  OfferDetail: { offerId: number };
  ServiceDetail: { serviceId: number };
  ShopDetail: { shopId: number | string };
  CategoryOffers: { categoryId: number; categoryName: string };
  Search: { query?: string } | undefined;
  ClaimConfirmation: { offerId: number };
  ServiceClaimConfirmation: { serviceOfferId: number; serviceId: number };
  ClaimQr: { claim: import('../types').Claim } | { serviceClaim: import('../types').ServiceOfferClaim };
  Notifications: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  NotificationPreferences: undefined;
  SelectLocation: undefined;
  EditPreferences: undefined;
  ThemeSettings: undefined;
  Devices: undefined;
  DeleteAccount: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

/** Structural nav prop for screens (EditProfile, ChangePassword, ThemeSettings) reused across
 * both the customer RootStack and the AdminStack — they only ever call goBack(). */
export interface GoBackScreenProps {
  navigation: { goBack: () => void };
}

/**
 * Structural nav prop for the authentication screens.
 *
 * They now live in two stacks: the pre-app AuthStack a first launch sees (§20),
 * and the RootStack, where a guest already inside the app can raise them as a
 * modal (§19). Both stacks carry the same four keys, which is all these screens
 * ever navigate between — so a structural type keeps one component working in
 * both places without casting.
 */
export interface AuthScreenProps<T extends keyof AuthStackParamList = 'Login'> {
  navigation: {
    navigate: (screen: 'Login' | 'Register' | 'ForgotPassword') => void;
    goBack: () => void;
    canGoBack: () => boolean;
  };
  route?: { params?: AuthStackParamList[T] };
}

/**
 * How the support and legal screens navigate between each other.
 *
 * They are registered in both the customer RootStack and the merchant
 * AdminStack, which are separate navigators - `RootNavigator` renders one or
 * the other, never both - so a component typed against one stack's param list
 * cannot be mounted in the other. The same problem the authentication screens
 * have above, solved the same way: a structural type naming only the keys
 * these screens actually navigate to, which both stacks satisfy.
 */
export interface SupportNavigation {
  navigate: {
    (screen: 'About' | 'Contact' | 'MySupportRequests'): void;
    (screen: 'HelpSupport', params?: SupportStackParamList['HelpSupport']): void;
    (screen: 'Legal', params: SupportStackParamList['Legal']): void;
  };
  /** Used from the confirmation screen, so Back does not return to the form. */
  replace: (screen: 'MySupportRequests') => void;
  goBack: () => void;
}

export interface SupportScreenProps<T extends keyof SupportStackParamList = 'About'> {
  navigation: SupportNavigation;
  route: { params?: SupportStackParamList[T] };
}

// ---- Shop Admin (V3) --------------------------------------------------------

export type AdminTabParamList = {
  Dashboard: undefined;
  Offers: undefined;
  Create: undefined;
  Analytics: undefined;
  AdminProfile: undefined;
};

export type AdminStackParamList = SupportStackParamList & {
  AdminTabs: undefined;
  OfferForm: { offerId?: number; duplicateFrom?: import('../types/admin').OfferFormValues } | undefined;
  /** The shop's own profile and location (V3 shop-location spec §3, §19). */
  ShopProfile: undefined;
  BranchList: undefined;
  BranchForm: { branchId?: number } | undefined;
  BannerList: undefined;
  BannerForm: { bannerId?: number } | undefined;
  Subscription: undefined;
  BillingHistory: undefined;
  AnalyticsDetail: { dashboard: 'overview' | 'offerPerformance' | 'funnel' | 'locations' | 'branches' };
  AdminServices: undefined;
  ServiceForm: { serviceId?: number } | undefined;
  ServiceOffers: { serviceId: number };
  ServiceOfferForm: { serviceId: number; offerId?: number };
  ServiceAnalytics: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  ThemeSettings: undefined;
  Devices: undefined;
  DeleteAccount: undefined;
};

export type AdminTabScreenProps<T extends keyof AdminTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, T>,
  NativeStackScreenProps<AdminStackParamList>
>;

export type AdminStackScreenProps<T extends keyof AdminStackParamList> = NativeStackScreenProps<AdminStackParamList, T>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
