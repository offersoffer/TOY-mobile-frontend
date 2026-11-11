import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Screen, EmptyState, LoadingView, Button } from '../../../components/ui';
import { useShopAdmin } from '../../../store/ShopAdminContext';
import { useBranches } from '../../../hooks/useAdminShop';
import { useShopEntitlements } from '../../../hooks/useSubscription';
import type { AdminStackScreenProps } from '../../../navigation/types';

type Props = AdminStackScreenProps<'BranchList'>;

export function BranchListScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { currentShopId, hasPermission } = useShopAdmin();
  const branches = useBranches(currentShopId);
  const entitlements = useShopEntitlements(currentShopId);
  const canManage = hasPermission('MANAGE_LOCATIONS');

  const limit = entitlements.data?.limits.branches;
  const atLimit = limit != null && (branches.data?.length ?? 0) >= limit;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.sm, marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>Branches</Text>
        </View>
        {canManage ? (
          <Pressable onPress={() => navigation.navigate('BranchForm', undefined)} hitSlop={8}>
            <Ionicons name="add-circle" size={26} color={colors.brand} />
          </Pressable>
        ) : null}
      </View>

      {limit != null ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
          {branches.data?.length ?? 0} / {limit} branches used on your plan
        </Text>
      ) : null}

      {branches.isLoading ? (
        <LoadingView />
      ) : (branches.data ?? []).length === 0 ? (
        <EmptyState icon="business-outline" title="No branches yet" message="Add a branch to manage location-specific offers." />
      ) : (
        <FlatList
          data={branches.data}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => canManage && navigation.navigate('BranchForm', { branchId: item.id })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.sm,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Ionicons name="business-outline" size={20} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
                  {item.branchName}{item.isPrimary ? '  ·  Primary' : ''}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{[item.address, item.city].filter(Boolean).join(', ')}</Text>
                {/*
                  §18: what is missing before an offer can go live here, so
                  the merchant finds out on the list rather than from a 422 on
                  a different screen. Nothing is shown for a branch that is
                  not trading, because the gate never checks one.
                */}
                {item.status === 'active' && (item.publishBlockers?.length ?? 0) > 0 ? (
                  <Text style={{ color: colors.warning, fontSize: fontSizes.xs, marginTop: spacing.xxs }}>
                    Needs {item.publishBlockers!.map((b) => b.label).join(', ')}
                  </Text>
                ) : null}
                {item.status !== 'active' ? (
                  <Text style={{ color: colors.textSubtle, fontSize: fontSizes.xs, marginTop: spacing.xxs }}>
                    Not trading
                  </Text>
                ) : null}
              </View>
              {canManage ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
            </Pressable>
          )}
        />
      )}

      {canManage && atLimit ? (
        <View style={{ padding: spacing.md }}>
          <Button label="Upgrade for more branches" variant="secondary" onPress={() => navigation.navigate('Subscription')} fullWidth />
        </View>
      ) : null}
    </Screen>
  );
}
