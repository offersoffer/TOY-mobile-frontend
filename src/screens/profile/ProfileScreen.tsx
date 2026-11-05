import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Screen, Avatar } from '../../components/ui';
import { BrandMark } from '../../components';
import { useAuth } from '../../store/AuthContext';
import { useAuthPrompt } from '../../store/AuthPromptContext';
import { GuestGate } from '../../components/GuestGate';
import type { VerificationStatus } from '../../types';
import type { MainTabScreenProps } from '../../navigation/types';

type Props = MainTabScreenProps<'Profile'>;

interface Row {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** A second line, for a row whose state the customer needs to see. */
  hint?: string;
}

/**
 * What the seller row says, by where their registration stands (§12).
 *
 * A registration in flight is the most useful thing this screen can tell
 * them, so the row reports it rather than reading "Sell on OffersOffer" as if
 * nothing had been started. Read from the membership the account already
 * carries, so the row costs no request.
 */
const SELLER_ROW: Record<VerificationStatus, { label: string; hint: string; icon: keyof typeof Ionicons.glyphMap }> = {
  DRAFT: {
    label: 'Finish registering your shop',
    hint: 'Your registration is saved — pick up where you left off',
    icon: 'storefront-outline',
  },
  PENDING_VERIFICATION: {
    label: 'Shop registration',
    hint: 'Pending verification',
    icon: 'time-outline',
  },
  ADDITIONAL_INFO_REQUIRED: {
    label: 'Shop registration',
    hint: 'We need a little more information',
    icon: 'alert-circle-outline',
  },
  REJECTED: {
    label: 'Shop registration',
    hint: 'Not approved — tap to read why',
    icon: 'close-circle-outline',
  },
  VERIFIED: { label: 'Shop registration', hint: 'Verified', icon: 'checkmark-circle-outline' },
  SUSPENDED: { label: 'Shop registration', hint: 'Suspended', icon: 'ban-outline' },
};

export function ProfileScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const prompt = useAuthPrompt();

  /**
   * Onboarding §3/§4: the way into self-service registration.
   *
   * Here rather than in the bottom navigation on purpose. The five tabs are
   * the customer's app and nearly every customer will never register a shop;
   * giving a merchant feature a sixth of that bar would cost every customer
   * something to serve a few. Profile is where account-level things already
   * live, and it is one tap away.
   *
   * A guest sees it too - §4 wants the path discoverable - and gets the login
   * sheet, which resumes into the wizard once they have an account.
   */
  const pending = user?.shops?.find((shop) => shop.awaitingFirstApproval) ?? null;
  const sellerRow: Row = pending?.verificationStatus
    ? { ...SELLER_ROW[pending.verificationStatus], onPress: () => navigation.navigate('SellerOnboarding') }
    : {
        icon: 'storefront-outline',
        label: 'Sell on OffersOffer',
        hint: 'Register your shop and reach customers nearby',
        onPress: () => {
          if (prompt.require('register-shop', () => navigation.navigate('SellerOnboarding'))) {
            navigation.navigate('SellerOnboarding');
          }
        },
      };

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const accountRows: Row[] = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'lock-closed-outline', label: 'Change Password', onPress: () => navigation.navigate('ChangePassword') },
    // §28: the customer stays signed in on every device until they end a
    // session, so they need somewhere to see and end them.
    { icon: 'phone-portrait-outline', label: 'Logged-in Devices', onPress: () => navigation.navigate('Devices') },
    { icon: 'location-outline', label: 'Preferred Location', onPress: () => navigation.navigate('SelectLocation') },
    { icon: 'options-outline', label: 'Preferences', onPress: () => navigation.navigate('EditPreferences') },
  ];

  const preferenceRows: Row[] = [
    { icon: 'notifications-outline', label: 'Notification Preferences', onPress: () => navigation.navigate('NotificationPreferences') },
    { icon: 'color-palette-outline', label: 'Theme', onPress: () => navigation.navigate('ThemeSettings') },
  ];

  const otherRows: Row[] = [
    { icon: 'log-out-outline', label: 'Logout', onPress: confirmLogout, destructive: true },
    // Required by Google Play's data-deletion policy to be reachable from
    // inside the app, not only from the website. Last in the list and below
    // Logout on purpose: it is the most destructive row on the screen.
    { icon: 'trash-outline', label: 'Delete Account', onPress: () => navigation.navigate('DeleteAccount'), destructive: true },
  ];

  /**
   * Help & legal. Built here rather than inside the signed-in branch because
   * both audiences get exactly this list: none of these rows reads account
   * data, and the two that matter most to somebody without an account are
   * Support ("I can't sign in") and Privacy (read before deciding to sign up).
   *
   * "My support requests" is the one exception, since a guest's tickets have
   * no owner and there is nothing to list.
   */
  const helpRows: Row[] = [
    { icon: 'help-buoy-outline', label: 'Help & Support', onPress: () => navigation.navigate('HelpSupport', undefined) },
    ...(isAuthenticated
      ? [
          {
            icon: 'chatbubbles-outline' as const,
            label: 'My Support Requests',
            onPress: () => navigation.navigate('MySupportRequests'),
          },
        ]
      : []),
    { icon: 'information-circle-outline', label: 'About OffersOffer', onPress: () => navigation.navigate('About') },
    { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => navigation.navigate('Legal', { document: 'privacy' }) },
    { icon: 'document-text-outline', label: 'Terms & Conditions', onPress: () => navigation.navigate('Legal', { document: 'terms' }) },
    { icon: 'call-outline', label: 'Contact Us', onPress: () => navigation.navigate('Contact') },
  ];

  // §23: a guest gets the welcome rather than an empty profile - every account
  // row above reads or writes data they do not have. But the welcome is no
  // longer the whole screen: Help, About, Privacy, Terms and Contact have to
  // stay reachable without an account, so they sit below it.
  if (!isAuthenticated) {
    return (
      <Screen>
        {/* `flexGrow` rather than `flex`: GuestGate centres itself with
            `flex: 1`, which needs the content container to fill the screen,
            while the list below still pushes the page taller when it has to. */}
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xl }}>
          <GuestGate
            icon="person-outline"
            title="Welcome to OffersOffer"
            message="Discover offers and services near you. Log in to save what you like, follow shops and track your savings."
            browseHint="Continue browsing as Guest — Offers, Services and Near Me need no account."
          />
          <View style={{ padding: spacing.md, gap: spacing.lg }}>
            <RowGroup title="For businesses" rows={[sellerRow]} />
            <RowGroup title="Help & legal" rows={helpRows} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}>
        {/*
          The mark gets its own row here rather than sitting beside the avatar.
          This screen's header is the customer's own face and name, which is the
          right thing to lead with on their profile - putting the app's logo in
          front of the person would read as the app introducing itself to
          someone already signed in.
        */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: -spacing.sm }}>
          <BrandMark />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Avatar uri={user?.avatarUrl} name={user?.name} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>{user?.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{user?.email}</Text>
            {user?.phone ? <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{user.phone}</Text> : null}
          </View>
        </View>

        <RowGroup title="For businesses" rows={[sellerRow]} />
        <RowGroup title="Account" rows={accountRows} />
        <RowGroup title="Preferences" rows={preferenceRows} />
        <RowGroup title="Help & legal" rows={helpRows} />
        <RowGroup rows={otherRows} />

        <Text style={{ color: colors.textSubtle, fontSize: fontSizes.xs, textAlign: 'center' }}>OffersOffer · v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

function RowGroup({ title, rows }: { title?: string; rows: Row[] }) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  return (
    <View style={{ gap: spacing.xxs }}>
      {title ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, textTransform: 'uppercase', marginBottom: 2 }}>
          {title}
        </Text>
      ) : null}
      <View style={{ borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surface }}>
        {rows.map((row, index) => (
          <Pressable
            key={row.label}
            onPress={row.onPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.sm,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.border,
            }}
          >
            <Ionicons name={row.icon} size={18} color={row.destructive ? colors.danger : colors.textMuted} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ color: row.destructive ? colors.danger : colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.medium }}>
                {row.label}
              </Text>
              {row.hint ? (
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{row.hint}</Text>
              ) : null}
            </View>
            {!row.destructive ? <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} /> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
