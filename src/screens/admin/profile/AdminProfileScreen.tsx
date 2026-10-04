import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Screen, Avatar } from '../../../components/ui';
import { PlanBadge } from '../../../components/admin';
import { useAuth } from '../../../store/AuthContext';
import { useShopAdmin } from '../../../store/ShopAdminContext';
import { useShopEntitlements } from '../../../hooks/useSubscription';
import type { AdminTabScreenProps } from '../../../navigation/types';

type Props = AdminTabScreenProps<'AdminProfile'>;

interface Row {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  trailing?: React.ReactNode;
}

export function AdminProfileScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { user, logout } = useAuth();
  const { currentShop, currentShopId, hasPermission } = useShopAdmin();
  const entitlements = useShopEntitlements(currentShopId);

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const shopRows: Row[] = [
    // §19: the shop's own address is edited here, not under Branches. Unlike
    // the read-only rows below this one is a form, so it is hidden rather than
    // marked read-only for staff who cannot save it.
    ...(hasPermission('EDIT_SHOP')
      ? [
          {
            icon: 'storefront-outline' as const,
            label: 'Shop Profile & Location',
            onPress: () => navigation.navigate('ShopProfile'),
          },
        ]
      : []),
    {
      icon: 'business-outline',
      label: 'Branches',
      onPress: () => navigation.navigate('BranchList'),
      trailing: hasPermission('MANAGE_LOCATIONS') ? undefined : <Ionicons name="eye-outline" size={16} color={colors.textSubtle} />,
    },
    ...(hasPermission('VIEW_BANNERS')
      ? [{ icon: 'image-outline' as const, label: 'Banners', onPress: () => navigation.navigate('BannerList') }]
      : []),
    {
      icon: 'card-outline',
      label: 'Subscription',
      onPress: () => navigation.navigate('Subscription'),
      trailing: entitlements.data ? <PlanBadge plan={entitlements.data.plan} /> : undefined,
    },
  ];

  const accountRows: Row[] = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'lock-closed-outline', label: 'Change Password', onPress: () => navigation.navigate('ChangePassword') },
    { icon: 'phone-portrait-outline', label: 'Logged-in Devices', onPress: () => navigation.navigate('Devices') },
    { icon: 'color-palette-outline', label: 'Theme', onPress: () => navigation.navigate('ThemeSettings') },
  ];

  /** The same five the customer app carries, plus the merchant's own tickets. */
  const helpRows: Row[] = [
    { icon: 'help-buoy-outline', label: 'Help & Support', onPress: () => navigation.navigate('HelpSupport', undefined) },
    { icon: 'chatbubbles-outline', label: 'My Support Requests', onPress: () => navigation.navigate('MySupportRequests') },
    { icon: 'information-circle-outline', label: 'About OffersOffer', onPress: () => navigation.navigate('About') },
    { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => navigation.navigate('Legal', { document: 'privacy' }) },
    { icon: 'document-text-outline', label: 'Terms & Conditions', onPress: () => navigation.navigate('Legal', { document: 'terms' }) },
    { icon: 'call-outline', label: 'Contact Us', onPress: () => navigation.navigate('Contact') },
  ];

  const otherRows: Row[] = [{ icon: 'log-out-outline', label: 'Logout', onPress: confirmLogout, destructive: true }];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Avatar uri={user?.avatarUrl} name={user?.name} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>{user?.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{user?.email}</Text>
            {currentShop ? <Text style={{ color: colors.brand, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>{currentShop.roleName} · {currentShop.shopName}</Text> : null}
          </View>
        </View>

        <RowGroup title="Shop" rows={shopRows} />
        <RowGroup title="Account" rows={accountRows} />
        <RowGroup title="Help & legal" rows={helpRows} />
        <RowGroup rows={otherRows} />
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
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}
          >
            <Ionicons name={row.icon} size={18} color={row.destructive ? colors.danger : colors.textMuted} />
            <Text style={{ flex: 1, color: row.destructive ? colors.danger : colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.medium }}>
              {row.label}
            </Text>
            {row.trailing ?? (!row.destructive ? <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} /> : null)}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
