import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Screen, Button, LoadingView } from '../../../components/ui';
import { PlanBadge } from '../../../components/admin';
import { useShopAdmin } from '../../../store/ShopAdminContext';
import {
  usePlanCatalogue,
  useShopEntitlements,
  useDowngrade,
  useCancelSubscription,
} from '../../../hooks/useSubscription';
import { getApiErrorMessage } from '../../../api/client';
import { formatDate } from '../../../utils/format';
import type { AdminStackScreenProps } from '../../../navigation/types';
import type { PlanKey, ShopEntitlements } from '../../../types/admin';

type Props = AdminStackScreenProps<'Subscription'>;

/**
 * Plans, read-only.
 *
 * This screen used to open Razorpay's hosted checkout for the paid merchant
 * plans. It cannot, on Android: Google Play's Payments policy requires Play
 * billing for "cloud software and services" and "business productivity
 * software", and has no exemption for B2B or SaaS. The exemptions it does list
 * - physical goods, content consumable outside the app, 1:1 services, tips -
 * do not cover a merchant subscription.
 *
 * The policy also forbids *leading* users to another payment method, so this
 * screen names no destination either. It says what each plan includes, what
 * this shop is on, and what it is using. Cancelling and moving to Free stay,
 * because neither is a purchase and a merchant must always be able to stop
 * paying. Switching between two paid tiers is gone with the checkout: it
 * changes what they are billed, which is transacting.
 *
 * A merchant who already subscribed on the web keeps that subscription; all
 * that is missing here is the way to start or change one.
 */

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

/** Wording for each subscription state (§9), so the merchant knows where they stand. */
function statusNotice(current: ShopEntitlements): { tone: 'warning' | 'danger' | 'info'; text: string } | null {
  if (current.status === 'past_due') {
    return {
      tone: 'danger',
      text: current.graceUntil
        ? `Your last payment failed. Your ${current.planName} features stay on until ${formatDate(
            current.graceUntil,
          )}, then the plan drops to Free.`
        // Deliberately not "retry the payment": an instruction to pay is the
        // steering the policy forbids, and there is nowhere in the app to do
        // it. The fact is reported; what to do about it is not.
        : 'Your last payment failed, so this plan will drop to Free.',
    };
  }
  if (current.status === 'cancelled') {
    const until = current.currentPeriodEnd ?? current.renewsAt;
    return {
      tone: 'warning',
      text: until
        ? `Cancelled. Your ${current.planName} plan stays active until ${formatDate(until)}.`
        : 'Cancelled. Your plan will move to Free shortly.',
    };
  }
  if (current.status === 'created' || current.paymentStatus === 'pending') {
    return {
      tone: 'info',
      text: `${current.planName} is waiting for payment confirmation. Features unlock as soon as the payment clears.`,
    };
  }
  if (current.cancelAtPeriodEnd && current.pendingPlan) {
    const until = current.currentPeriodEnd ?? current.renewsAt;
    return {
      tone: 'info',
      text: `Scheduled to move to ${current.pendingPlan} on ${until ? formatDate(until) : 'the next billing date'}.`,
    };
  }
  if (current.status === 'paused') {
    return { tone: 'warning', text: 'Your subscription is paused at the payment gateway.' };
  }
  return null;
}

export function SubscriptionScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii, shadows } = useTheme();
  const { currentShopId, hasPermission } = useShopAdmin();
  const catalogue = usePlanCatalogue();
  const entitlements = useShopEntitlements(currentShopId);
  const downgrade = useDowngrade(currentShopId);
  const cancel = useCancelSubscription(currentShopId);
  const [error, setError] = useState<string | null>(null);
  const canManage = hasPermission('MANAGE_SUBSCRIPTION');

  const onDowngrade = useCallback(
    (plan: PlanKey, current: ShopEntitlements) => {
      const until = current.currentPeriodEnd ?? current.renewsAt;
      Alert.alert(
        `Move to ${plan === 'FREE' ? 'Free' : plan}?`,
        until
          ? `Your ${current.planName} benefits continue until ${formatDate(
              until,
            )}. The new plan takes effect after that. Your data is kept either way.`
          : 'The new plan takes effect right away. Your data is kept either way.',
        [
          { text: 'Keep current plan', style: 'cancel' },
          {
            text: 'Confirm',
            style: 'destructive',
            onPress: () =>
              downgrade.mutate(
                { plan },
                { onError: (err) => setError(getApiErrorMessage(err, 'Could not change plan.')) },
              ),
          },
        ],
      );
    },
    [downgrade],
  );

  const onCancel = useCallback(
    (current: ShopEntitlements) => {
      const until = current.currentPeriodEnd ?? current.renewsAt;
      Alert.alert(
        'Cancel subscription',
        until
          ? `Your current plan will remain active until ${formatDate(
              until,
            )}. Recurring billing stops immediately.`
          : 'Recurring billing stops immediately. Your plan will move to Free.',
        [
          { text: 'Keep subscription', style: 'cancel' },
          {
            text: 'Cancel subscription',
            style: 'destructive',
            onPress: () =>
              cancel.mutate(undefined, {
                onError: (err) => setError(getApiErrorMessage(err, 'Could not cancel the subscription.')),
              }),
          },
        ],
      );
    },
    [cancel],
  );

  if (entitlements.isLoading || catalogue.isLoading) return <LoadingView />;
  if (!entitlements.data) return null;

  const current = entitlements.data;
  const notice = statusNotice(current);
  const specialAccess = (current.specialAccess ?? []).filter((entry) => entry.status === 'active');

  const card = {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  } as const;

  const noticeColor =
    notice?.tone === 'danger' ? colors.danger : notice?.tone === 'warning' ? colors.warning : colors.brand;

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>
          Subscription
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={entitlements.isRefetching} onRefresh={() => entitlements.refetch()} />
        }
      >
        {/* ---- Current plan (§14) ---- */}
        <View style={[shadows.sm, card, { gap: spacing.xs }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold }}>
              {current.planName}
            </Text>
            <PlanBadge plan={current.plan} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {current.price === 0 ? 'Free' : `${rupees(current.price)} / month`}
          </Text>

          <DetailRow label="Status" value={current.status.replace('_', ' ')} />
          {current.startedAt ? <DetailRow label="Started" value={formatDate(current.startedAt)} /> : null}
          {current.nextBillingDate && current.status === 'active' ? (
            <DetailRow label="Next billing" value={formatDate(current.nextBillingDate)} />
          ) : null}
          {current.paymentMethod ? (
            <DetailRow label="Payment method" value={current.paymentMethod.toUpperCase()} />
          ) : null}
          {current.plan !== 'FREE' ? (
            <DetailRow label="AutoPay" value={current.autopayEnabled ? 'Active' : 'Not set up'} />
          ) : null}
        </View>

        {notice ? (
          <View
            style={[
              card,
              { borderColor: noticeColor, backgroundColor: colors.surfaceAlt, flexDirection: 'row', gap: spacing.xs },
            ]}
          >
            <Ionicons name="information-circle-outline" size={18} color={noticeColor} />
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, flex: 1 }}>{notice.text}</Text>
          </View>
        ) : null}

        {/* ---- Special access granted by the Super Admin (§11N) ---- */}
        {specialAccess.length ? (
          <View style={[shadows.sm, card, { gap: spacing.xs }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
              <Ionicons name="sparkles-outline" size={16} color={colors.brand} />
              <Text style={{ color: colors.text, fontWeight: fontWeights.bold }}>Special access</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              Granted by the OffersOffer team, independently of your plan.
            </Text>
            {specialAccess.map((entry) => (
              <View key={entry.featureKey} style={{ gap: 2, marginTop: spacing.xxs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' }}>
                    {entry.featureName}
                  </Text>
                </View>
                <Text style={{ color: colors.textSubtle, fontSize: fontSizes.xs, marginLeft: 22 }}>
                  {entry.isPermanent
                    ? 'Permanent'
                    : entry.expiresAt
                      ? `Expires ${formatDate(entry.expiresAt)}`
                      : 'Active'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ---- Usage ---- */}
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontWeight: fontWeights.bold }}>Usage</Text>
          <UsageRow
            label="Offers this month"
            used={current.usage.offersThisMonth}
            limit={current.limits.offersPerMonth}
          />
          <UsageRow label="Branches" used={current.usage.branches} limit={current.limits.branches} />
          <UsageRow label="Categories" used={current.usage.categories} limit={current.limits.categories} />
          <UsageRow label="Banners" used={current.usage.banners} limit={current.limits.banners} />
        </View>

        {error ? <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>{error}</Text> : null}

        <Button
          label="Billing history & invoices"
          variant="secondary"
          onPress={() => navigation.navigate('BillingHistory')}
        />

        {canManage ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.bold }}>Plans</Text>

            {/*
              What each plan includes, and nothing that starts or changes one.
              The sentence names no destination on purpose: pointing at one
              would be the steering the policy forbids, and the merchant
              already manages their shop elsewhere.
            */}
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              Plan changes are not made in the app.
            </Text>

            {(catalogue.data?.plans ?? []).map((plan) => {
              const isCurrent = plan.key === current.plan;
              // Only a move to Free is offered. Everything above it either
              // starts a subscription or changes what the shop is billed.
              const isFree = plan.key === 'FREE';

              return (
                <View
                  key={plan.key}
                  style={[
                    shadows.sm,
                    card,
                    {
                      borderWidth: isCurrent ? 2 : 1,
                      borderColor: isCurrent ? colors.brand : colors.border,
                      gap: 4,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontWeight: fontWeights.bold }}>{plan.name}</Text>
                    <Text style={{ color: colors.text, fontWeight: fontWeights.bold }}>
                      {plan.price === 0 ? 'Free' : `${rupees(plan.price)}/mo`}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{plan.description}</Text>

                  {!isCurrent && isFree ? (
                    <Button
                      label="Move to Free"
                      variant="secondary"
                      onPress={() => onDowngrade(plan.key, current)}
                      loading={downgrade.isPending}
                      style={{ marginTop: spacing.xxs }}
                    />
                  ) : null}
                </View>
              );
            })}

            {current.plan !== 'FREE' && current.status !== 'cancelled' ? (
              <Button
                label="Cancel subscription"
                variant="danger"
                onPress={() => onCancel(current)}
                loading={cancel.isPending}
              />
            ) : null}
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            You don&rsquo;t have permission to manage this shop&rsquo;s subscription.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors, fontSizes } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: '600', textTransform: 'capitalize' }}>
        {value}
      </Text>
    </View>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const { colors, fontSizes, radii } = useTheme();
  const isUnlimited = limit == null;
  const pct = isUnlimited ? 0 : limit === 0 ? 100 : Math.min(100, (used / limit) * 100);

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' }}>
          {isUnlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
        </Text>
      </View>
      {!isUnlimited ? (
        <View style={{ height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: pct >= 100 ? colors.danger : colors.brand }} />
        </View>
      ) : null}
    </View>
  );
}
