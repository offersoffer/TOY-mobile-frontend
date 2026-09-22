import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminTabNavigator } from './AdminTabNavigator';
import { OfferFormScreen } from '../screens/admin/offers/OfferFormScreen';
import { ShopProfileScreen } from '../screens/admin/profile/ShopProfileScreen';
import { BranchListScreen } from '../screens/admin/branches/BranchListScreen';
import { BranchFormScreen } from '../screens/admin/branches/BranchFormScreen';
import { BannerListScreen } from '../screens/admin/banners/BannerListScreen';
import { BannerFormScreen } from '../screens/admin/banners/BannerFormScreen';
import { SubscriptionScreen } from '../screens/admin/subscription/SubscriptionScreen';
import { BillingHistoryScreen } from '../screens/admin/subscription/BillingHistoryScreen';
import { AnalyticsDetailScreen } from '../screens/admin/analytics/AnalyticsDetailScreen';
import { AdminServicesScreen } from '../screens/admin/services/AdminServicesScreen';
import { ServiceFormScreen } from '../screens/admin/services/ServiceFormScreen';
import { ServiceOffersScreen } from '../screens/admin/services/ServiceOffersScreen';
import { ServiceOfferFormScreen } from '../screens/admin/services/ServiceOfferFormScreen';
import { ServiceAnalyticsScreen } from '../screens/admin/services/ServiceAnalyticsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { ThemeSettingsScreen } from '../screens/profile/ThemeSettingsScreen';
import { DevicesScreen } from '../screens/profile/DevicesScreen';
import { DeleteAccountScreen } from '../screens/profile/DeleteAccountScreen';
import { AboutScreen } from '../screens/support/AboutScreen';
import { ContactScreen } from '../screens/support/ContactScreen';
import { HelpSupportScreen } from '../screens/support/HelpSupportScreen';
import { LegalScreen } from '../screens/support/LegalScreen';
import { MySupportRequestsScreen } from '../screens/support/MySupportRequestsScreen';
import type { AdminStackParamList } from './types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <Stack.Screen name="OfferForm" component={OfferFormScreen} />
      <Stack.Screen name="ShopProfile" component={ShopProfileScreen} />
      <Stack.Screen name="BranchList" component={BranchListScreen} />
      <Stack.Screen name="BranchForm" component={BranchFormScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BannerList" component={BannerListScreen} />
      <Stack.Screen name="BannerForm" component={BannerFormScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="BillingHistory" component={BillingHistoryScreen} />
      <Stack.Screen name="AnalyticsDetail" component={AnalyticsDetailScreen} />
      <Stack.Screen name="AdminServices" component={AdminServicesScreen} />
      <Stack.Screen name="ServiceForm" component={ServiceFormScreen} />
      <Stack.Screen name="ServiceOffers" component={ServiceOffersScreen} />
      <Stack.Screen name="ServiceOfferForm" component={ServiceOfferFormScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ServiceAnalytics" component={ServiceAnalyticsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />

      {/*
        The same five screens the customer app registers. A merchant is a user
        too - "Subscription / Billing" and "Merchant / Shop Account" are two of
        the support categories - and this stack is the only one they ever see.
      */}
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="MySupportRequests" component={MySupportRequestsScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
    </Stack.Navigator>
  );
}
