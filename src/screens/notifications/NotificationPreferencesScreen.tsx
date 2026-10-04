import React from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Screen, LoadingView } from '../../components/ui';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../../hooks/useNotifications';
import type { RootStackScreenProps } from '../../navigation/types';
import { usePush } from '../../services/notifications/PushNotificationsProvider';
import type { NotificationPreferences } from '../../types';

type Props = RootStackScreenProps<'NotificationPreferences'>;

type Row = { key: keyof NotificationPreferences; label: string; description: string };

/**
 * The categories a customer controls (Push §6).
 *
 * Split into the categories themselves and the two delivery channels, because
 * they answer different questions: a category decides whether a notification is
 * created at all, while `pushEnabled` and `emailEnabled` only decide how an
 * already-created notification reaches them. Turning both channels off still
 * leaves everything in the in-app notification centre (Push §29).
 */
const CATEGORY_ROWS: Row[] = [
  { key: 'favoriteExpiring', label: 'Saved Offer Expiry', description: 'Reminders before your saved offers end' },
  { key: 'savedServiceOfferExpiring', label: 'Saved Service Offer Expiry', description: 'Reminders before your saved service offers end' },
  { key: 'nearbyOffers', label: 'Nearby Offers', description: 'Deals near your current location' },
  { key: 'followedShopOffers', label: 'Followed Shop Offers', description: 'New offers from shops you follow' },
  { key: 'followedCategoryOffers', label: 'Followed Category Offers', description: 'New offers in categories you follow' },
  { key: 'offerUpdates', label: 'Recommended Offers', description: 'Personalized offer suggestions' },
  { key: 'claimUpdates', label: 'Claim Updates', description: 'Confirmation and code when you claim an offer' },
  { key: 'redemptionUpdates', label: 'Redemption Updates', description: 'Confirmation when an offer is redeemed' },
  { key: 'bookingUpdates', label: 'Booking Updates', description: 'Confirmations and changes to your bookings' },
  { key: 'adminAnnouncements', label: 'Promotions', description: 'App-wide announcements and promotions' },
];

const CHANNEL_ROWS: Row[] = [
  { key: 'pushEnabled', label: 'Push Notifications', description: 'Show these on your device' },
  { key: 'emailEnabled', label: 'Email Notifications', description: 'Also receive these updates by email' },
];

const ROWS: Row[] = [...CATEGORY_ROWS, ...CHANNEL_ROWS];

const SECTIONS: Array<{ title: string; rows: Row[] }> = [
  { title: 'What you hear about', rows: CATEGORY_ROWS },
  { title: 'How you hear about it', rows: CHANNEL_ROWS },
];

export function NotificationPreferencesScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const { permission, enable } = usePush();

  if (isLoading || !preferences) return <LoadingView />;

  const setAll = (value: boolean) => {
    const patch = Object.fromEntries(ROWS.map((r) => [r.key, value])) as Partial<NotificationPreferences>;
    update.mutate(patch);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm, marginBottom: spacing.sm }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>Notification Preferences</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
        <Pressable onPress={() => setAll(true)}>
          <Text style={{ color: colors.brand, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>Enable All</Text>
        </Pressable>
        <Pressable onPress={() => setAll(false)}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>Disable All</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.xs }}>
        {/*
          The app's own switches cannot override the operating system's. When
          permission was never granted or was later revoked in Settings, saying
          so - with the way to fix it - is the only honest thing to show above
          a list of toggles that otherwise look like they are in charge.
        */}
        {permission !== 'granted' ? (
          <Pressable
            onPress={() => (permission === 'denied' ? Linking.openSettings() : enable())}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.sm,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.brand,
              backgroundColor: colors.brandTint,
              marginBottom: spacing.xs,
            }}
          >
            <Ionicons name="notifications-off-outline" size={20} color={colors.brandStrong} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.semibold }}>
                Push notifications are off
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                {permission === 'denied'
                  ? 'Turn them on for OffersOffer in your device settings.'
                  : 'Tap to allow notifications on this device.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {SECTIONS.map((section) => (
          <View key={section.title} style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.xs,
                fontWeight: fontWeights.semibold,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginTop: spacing.xs,
              }}
            >
              {section.title}
            </Text>

            {section.rows.map((row) => (
              <View
                key={row.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing.sm,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <View style={{ flex: 1, gap: 2, marginRight: spacing.sm }}>
                  <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.semibold }}>{row.label}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{row.description}</Text>
                </View>
                <Switch
                  value={preferences[row.key]}
                  onValueChange={(value) => update.mutate({ [row.key]: value })}
                  trackColor={{ false: colors.border, true: colors.brand }}
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
