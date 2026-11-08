import React from 'react';
import { Dimensions, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Screen, LoadingView } from '../../../components/ui';
import { MetricCard, PlanBadge } from '../../../components/admin';
import { useShopAdmin } from '../../../store/ShopAdminContext';
import { useAuth } from '../../../store/AuthContext';
import { useOverviewAnalytics, usePremiumOverview } from '../../../hooks/useAdminAnalytics';
import { useShopEntitlements } from '../../../hooks/useSubscription';
import type { AdminTabScreenProps } from '../../../navigation/types';

type Props = AdminTabScreenProps<'Dashboard'>;

const CARD_WIDTH = (Dimensions.get('window').width - 16 * 2 - 12) / 2;

export function AdminDashboardScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights } = useTheme();
  const { user } = useAuth();
  const { shops, currentShop, currentShopId, setCurrentShopId, hasPermission } = useShopAdmin();
  const entitlements = useShopEntitlements(currentShopId);
  const overview = useOverviewAnalytics({ shopId: currentShopId ?? undefined, preset: 'last30' });
  // Asks about the entitlement rather than the plan name: a Super Admin grant
  // can give a Free shop advanced analytics without changing its plan (§11K).
  const hasAdvancedAnalytics = entitlements.data?.features.includes('ANALYTICS_ADVANCED') ?? false;
  const premiumOverview = usePremiumOverview({ shopId: currentShopId ?? undefined, preset: 'last30' }, hasAdvancedAnalytics);

  if (!currentShopId) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ color: colors.textMuted }}>No shop assigned to your account.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={overview.isRefetching} onRefresh={() => overview.refetch()} tintColor={colors.brand} />}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Hi {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>{currentShop?.shopName}</Text>
          </View>
          {entitlements.data ? <PlanBadge plan={entitlements.data.plan} /> : null}
        </View>

        {shops.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {shops.map((shop) => (
              <Pressable
                key={shop.shopId}
                onPress={() => setCurrentShopId(shop.shopId)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: spacing.sm,
                  borderRadius: 999,
                  backgroundColor: shop.shopId === currentShopId ? colors.brand : colors.surface,
                  borderWidth: 1,
                  borderColor: shop.shopId === currentShopId ? colors.brand : colors.border,
                }}
              >
                <Text style={{ color: shop.shopId === currentShopId ? colors.textOnBrand : colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>
                  {shop.shopName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {hasAdvancedAnalytics && premiumOverview.data ? (
          <View
            style={{
              backgroundColor: colors.brandTint,
              borderRadius: 14,
              padding: spacing.md,
              gap: 6,
              borderWidth: 1,
              borderColor: colors.brandLight,
            }}
          >
            <Text style={{ color: colors.brandStrong, fontSize: fontSizes.xs, fontWeight: fontWeights.bold, letterSpacing: 0.5 }}>
              THIS MONTH
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSizes.md }}>
              📈 Reach: {premiumOverview.data.totals.reach ?? 0} · 👁 Views: {premiumOverview.data.totals.views ?? 0}
            </Text>
            {premiumOverview.data.alerts.map((alert) => (
              <Text key={alert.key} style={{ color: colors.text, fontSize: fontSizes.md }}>
                {alert.icon} {alert.message}
              </Text>
            ))}
          </View>
        ) : null}

        {overview.isLoading ? (
          <LoadingView fullScreen={false} />
        ) : overview.data ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <MetricCard width={CARD_WIDTH} label="Active Offers" value={overview.data.offers.active} icon="pricetag-outline" tone="success" />
            <MetricCard width={CARD_WIDTH} label="Expiring Soon" value={overview.data.offers.expiringSoon} icon="time-outline" tone="warning" />
            <MetricCard width={CARD_WIDTH} label="Views" value={overview.data.engagement.views} icon="eye-outline" />
            <MetricCard width={CARD_WIDTH} label="Claims" value={overview.data.engagement.claims} icon="ticket-outline" />
            <MetricCard width={CARD_WIDTH} label="Redemptions" value={overview.data.engagement.redemptions} icon="checkmark-circle-outline" tone="success" />
            <MetricCard width={CARD_WIDTH} label="Scheduled" value={overview.data.offers.scheduled} icon="calendar-outline" />
          </View>
        ) : null}

        {/* §24. Reachable from here as well as from the Verify tab, because a
            member of staff may hold VIEW_REDEMPTION_HISTORY without
            VERIFY_CLAIM - a manager who reads the till log but never works
            the counter - and for them that tab is not there to carry it. */}
        {hasPermission('VIEW_REDEMPTION_HISTORY') ? (
          <Pressable
            onPress={() => navigation.navigate('Redemptions')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.sm,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Redemption History</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate('Subscription')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.sm,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Manage Subscription</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('AdminServices')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.sm,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Manage Services</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('ServiceAnalytics')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.sm,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Service Analytics</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
