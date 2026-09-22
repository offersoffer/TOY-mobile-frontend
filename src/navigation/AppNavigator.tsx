import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabNavigator } from './MainTabNavigator';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { OfferDetailScreen } from '../screens/offers/OfferDetailScreen';
import { ServiceDetailScreen } from '../screens/services/ServiceDetailScreen';
import { ShopDetailScreen } from '../screens/shops/ShopDetailScreen';
import { CategoryOffersScreen } from '../screens/explore/CategoryOffersScreen';
import { SearchScreen } from '../screens/explore/SearchScreen';
import { ClaimConfirmationScreen } from '../screens/claims/ClaimConfirmationScreen';
import { ServiceClaimConfirmationScreen } from '../screens/services/ServiceClaimConfirmationScreen';
import { ClaimQrScreen } from '../screens/claims/ClaimQrScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { NotificationPreferencesScreen } from '../screens/notifications/NotificationPreferencesScreen';
import { SelectLocationScreen } from '../screens/profile/SelectLocationScreen';
import { EditPreferencesScreen } from '../screens/profile/EditPreferencesScreen';
import { ThemeSettingsScreen } from '../screens/profile/ThemeSettingsScreen';
import { DevicesScreen } from '../screens/profile/DevicesScreen';
import { DeleteAccountScreen } from '../screens/profile/DeleteAccountScreen';
import { AboutScreen } from '../screens/support/AboutScreen';
import { ContactScreen } from '../screens/support/ContactScreen';
import { HelpSupportScreen } from '../screens/support/HelpSupportScreen';
import { LegalScreen } from '../screens/support/LegalScreen';
import { MySupportRequestsScreen } from '../screens/support/MySupportRequestsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />

      {/*
        §19/§21: a guest browsing the app can be asked to authenticate at any
        point, so these live in the main stack too. Presented as modals so the
        screen the guest was on is still underneath - dismissing returns them to
        the offer they were reading rather than to the top of the app (§5).
      */}
      <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <Stack.Screen name="ShopDetail" component={ShopDetailScreen} />
      <Stack.Screen name="CategoryOffers" component={CategoryOffersScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ClaimConfirmation" component={ClaimConfirmationScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ServiceClaimConfirmation" component={ServiceClaimConfirmationScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ClaimQr" component={ClaimQrScreen} options={{ presentation: 'modal', gestureEnabled: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="SelectLocation" component={SelectLocationScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditPreferences" component={EditPreferencesScreen} />
      <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />

      {/*
        Company, support and legal. In the main stack rather than behind the
        Profile tab's auth check, because a guest has to be able to reach all
        five - Support most of all, since "I can't sign in" cannot be filed
        from behind a login.
      */}
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="MySupportRequests" component={MySupportRequestsScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
    </Stack.Navigator>
  );
}
