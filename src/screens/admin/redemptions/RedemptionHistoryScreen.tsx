import React, { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Screen, Chip, Badge, EmptyState, LoadingView, ErrorState, TextField } from '../../../components/ui';
import { getApiErrorMessage, isNetworkError } from '../../../api/client';
import { useShopAdmin } from '../../../store/ShopAdminContext';
import { useClaimAudit, useClaimsConsole, useRedemptionHistory } from '../../../hooks/useRedemptions';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import type { AdminStackScreenProps } from '../../../navigation/types';
import type { ClaimKind, MerchantClaim } from '../../../types/admin';

type Props = AdminStackScreenProps<'Redemptions'>;

type Tab = 'redeemed' | 'claims';

/**
 * Merchant redemption history (Claim/Redemption §24).
 *
 * Two tabs over one search box. "Redeemed" is the shop's evidence of
 * conversions - the list §39 is really about. "All claims" is what a dispute
 * is investigated from, and what shows what is still outstanding.
 *
 * The audit trail (§30) opens from any row, which is the point: when a
 * customer says their code was refused, the answer is the sequence of
 * attempts against that claim and nothing else will do.
 *
 * No export here, unlike the web screen: `EXPORT_REDEMPTION_REPORT` returns a
 * spreadsheet, and a phone has nowhere useful to put one.
 */
export function RedemptionHistoryScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { currentShopId, hasPermission } = useShopAdmin();

  const [tab, setTab] = useState<Tab>('redeemed');
  const [kind, setKind] = useState<ClaimKind>('offer');
  const [search, setSearch] = useState('');
  const [openClaim, setOpenClaim] = useState<MerchantClaim | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);
  const params = {
    kind,
    shopId: currentShopId ?? undefined,
    search: debouncedSearch.trim() || undefined,
  };

  // Both hooks are mounted; only the selected tab's query runs, so coming
  // back to a list already loaded shows it from cache rather than re-fetching.
  const redeemed = useRedemptionHistory(params, tab === 'redeemed');
  const all = useClaimsConsole(params, tab === 'claims');
  const query = tab === 'redeemed' ? redeemed : all;

  const canViewAllClaims = hasPermission('VIEW_CLAIMS');
  const rows = query.data?.pages.flatMap((page) => page.claims) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>Redemptions</Text>
      </View>

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm }}>
        {canViewAllClaims ? (
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Chip label="Redeemed" selected={tab === 'redeemed'} onPress={() => setTab('redeemed')} />
            <Chip label="All claims" selected={tab === 'claims'} onPress={() => setTab('claims')} />
          </View>
        ) : null}

        {/* §22: one listing kind at a time. The verify screen is the opposite -
            there the shopkeeper must never have to choose. */}
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Chip label="Offers" selected={kind === 'offer'} onPress={() => setKind('offer')} />
          <Chip label="Services" selected={kind === 'service_offer'} onPress={() => setKind('service_offer')} />
        </View>

        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Search code, customer or offer"
          autoCorrect={false}
          leftIcon="search-outline"
          returnKeyType="search"
        />
      </View>

      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorState
          message={getApiErrorMessage(query.error)}
          offline={isNetworkError(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={tab === 'redeemed' ? 'No redemptions yet' : 'No claims yet'}
          message={
            debouncedSearch.trim()
              ? 'Nothing matches that search.'
              : tab === 'redeemed'
                ? 'Codes you confirm at the counter appear here.'
                : 'Coupons customers claim appear here, redeemed or not.'
          }
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          onEndReached={() => query.hasNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.xxs }}>
              {total} {total === 1 ? 'record' : 'records'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setOpenClaim(item)}
              style={{
                padding: spacing.sm,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
                <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.semibold }}>
                  {item.offer.title}
                </Text>
                <Badge label={statusLabel(item)} tone={statusTone(item.status)} />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                {item.customer.name} · {item.code}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={13} color={colors.textSubtle} />
                <Text style={{ color: colors.textSubtle, fontSize: fontSizes.xs }}>
                  {item.redeemedAt ? `Redeemed ${formatWhen(item.redeemedAt)}` : `Claimed ${formatWhen(item.claimedAt)}`}
                  {item.branch ? ` · ${item.branch.name}` : ''}
                  {item.verificationMethod === 'QR_SCAN' ? ' · scanned' : ''}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <AuditSheet claim={openClaim} onClose={() => setOpenClaim(null)} />
    </Screen>
  );
}

/** The §30 trail for one claim, rejections included. */
function AuditSheet({ claim, onClose }: { claim: MerchantClaim | null; onClose: () => void }) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const audit = useClaimAudit(claim?.id ?? null, claim?.kind ?? 'offer');

  return (
    <Modal visible={claim !== null} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.page,
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          padding: spacing.md,
          gap: spacing.sm,
          maxHeight: '70%',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold }}>
            {claim?.code}
          </Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {audit.isLoading ? (
          <LoadingView fullScreen={false} />
        ) : audit.isError ? (
          <ErrorState
            message={getApiErrorMessage(audit.error)}
            offline={isNetworkError(audit.error)}
            onRetry={() => audit.refetch()}
          />
        ) : (
          <FlatList
            data={audit.data?.events ?? []}
            keyExtractor={(event) => String(event.id)}
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.base }}>
                No verification attempts recorded for this claim.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                <Ionicons name={auditIcon(item.action)} size={18} color={auditColor(item.action, colors)} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.text, fontSize: fontSizes.base, fontWeight: fontWeights.semibold }}>
                    {auditLabel(item.action)}
                    {item.reason ? ` · ${item.reason.replace(/_/g, ' ').toLowerCase()}` : ''}
                  </Text>
                  <Text style={{ color: colors.textSubtle, fontSize: fontSizes.xs }}>
                    {formatWhen(item.at)}
                    {item.actor ? ` · ${item.actor.name}` : ''}
                    {item.branch ? ` · ${item.branch.name}` : ''}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function statusLabel(claim: MerchantClaim): string {
  if (claim.status === 'claimed') return claim.expiresAt && new Date(claim.expiresAt) < new Date() ? 'expired' : 'ready';
  return claim.status;
}

function statusTone(status: MerchantClaim['status']): 'success' | 'info' | 'warning' | 'danger' | 'default' {
  switch (status) {
    case 'redeemed':
      return 'success';
    case 'claimed':
      return 'info';
    case 'expired':
      return 'warning';
    case 'revoked':
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

function auditLabel(action: string): string {
  switch (action) {
    case 'VERIFIED':
      return 'Checked at the counter';
    case 'REDEEMED':
      return 'Redemption confirmed';
    case 'REJECTED':
      return 'Refused';
    case 'REVOKED':
      return 'Revoked by OffersOffer';
    default:
      return action;
  }
}

function auditIcon(action: string): keyof typeof Ionicons.glyphMap {
  switch (action) {
    case 'REDEEMED':
      return 'checkmark-circle-outline';
    case 'REJECTED':
      return 'close-circle-outline';
    case 'REVOKED':
      return 'ban-outline';
    default:
      return 'eye-outline';
  }
}

function auditColor(action: string, colors: { success: string; danger: string; textMuted: string }): string {
  if (action === 'REDEEMED') return colors.success;
  if (action === 'REJECTED' || action === 'REVOKED') return colors.danger;
  return colors.textMuted;
}

/** "Today 14:02" / "7 Nov 14:02" - a shopkeeper reading a till log wants the time. */
function formatWhen(iso: string): string {
  const at = new Date(iso);
  const time = at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const sameDay =
    at.getDate() === today.getDate() && at.getMonth() === today.getMonth() && at.getFullYear() === today.getFullYear();
  if (sameDay) return `Today ${time}`;
  return `${at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${time}`;
}
