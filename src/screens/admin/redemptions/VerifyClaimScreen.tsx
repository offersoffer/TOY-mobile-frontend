import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Screen, Button, TextField, Badge } from '../../../components/ui';
import { MetricCard } from '../../../components/admin';
import { useShopAdmin } from '../../../store/ShopAdminContext';
import { useRedemptionSummary, useVerifyClaim, useRedeemClaim, useRejectClaim } from '../../../hooks/useRedemptions';
import { toRejection } from '../../../api/redemptions';
import type { AdminTabScreenProps } from '../../../navigation/types';
import type { ClaimRejection, ClaimVerification, MerchantClaim, VerificationMethod } from '../../../types/admin';

type Props = AdminTabScreenProps<'Verify'>;

/** What the screen is currently showing. */
type Stage = 'idle' | 'verified' | 'redeemed' | 'rejected';

/**
 * Verify Claim (Claim/Redemption §7-§11), the shopkeeper's counter screen.
 *
 * The two-step shape is the whole design. Scanning or typing a code only ever
 * *asks* - it shows what is being presented and stops. Nothing about the claim
 * changes until Confirm Redemption is pressed, because the benefit is handed
 * over in the physical world and only the person standing there knows whether
 * that happened (§38.7).
 *
 * The camera is the primary path here, where the web screen's is the keypad:
 * the customer is holding their phone up to this one. Manual entry is still
 * permanently on screen rather than behind a "having trouble?" link (§9) -
 * a cracked screen, a dead battery and a customer reading the code aloud are
 * all ordinary, not edge cases.
 */
export function VerifyClaimScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { currentShopId, currentShop, hasPermission } = useShopAdmin();
  const summary = useRedemptionSummary(currentShopId ?? undefined);

  const verify = useVerifyClaim();
  const redeem = useRedeemClaim();
  const reject = useRejectClaim();

  const [stage, setStage] = useState<Stage>('idle');
  const [claim, setClaim] = useState<ClaimVerification | null>(null);
  const [redeemed, setRedeemed] = useState<MerchantClaim | null>(null);
  const [rejection, setRejection] = useState<ClaimRejection | null>(null);
  const [code, setCode] = useState('');

  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  /**
   * `onBarcodeScanned` keeps firing for as long as the code is in frame, so
   * the first hit has to close the gate synchronously. A state flag would not:
   * several callbacks can run before React re-renders, and each would post its
   * own verify for the same coupon.
   */
  const scanLock = useRef(false);

  /**
   * How the claim on screen was found. Held here rather than read back off the
   * claim, because `verificationMethod` is only written when a redemption
   * actually happens - on a verified-but-unredeemed claim it is still null,
   * and §30 wants the method that led to this redemption.
   */
  const lastMethod = useRef<VerificationMethod>('CODE_ENTRY');

  const busy = verify.isPending || redeem.isPending;
  const canRedeem = hasPermission('REDEEM_OFFER');

  /**
   * Close the camera when the tab is left. Bottom-tab screens stay mounted, so
   * without this the preview would keep running behind Dashboard or Offers -
   * a live camera the shopkeeper can no longer see, and a battery drain on a
   * phone that spends its day on the counter.
   */
  useFocusEffect(
    useCallback(() => () => {
      scanLock.current = true;
      setScanning(false);
    }, []),
  );

  const runVerify = useCallback(
    (payload: { code?: string; qrToken?: string; method: VerificationMethod }) => {
      lastMethod.current = payload.method;
      setRejection(null);
      setRedeemed(null);

      verify.mutate(payload, {
        onSuccess: (result) => {
          setClaim(result);
          setStage('verified');
        },
        onError: (error) => {
          setClaim(null);
          setStage('rejected');
          setRejection(toRejection(error, 'That code could not be checked. Try again.'));
        },
      });
    },
    [verify],
  );

  // ---- Scanning -----------------------------------------------------------

  const startScan = async () => {
    // `granted` is false both before anyone was asked and after a refusal;
    // `canAskAgain` is what tells the two apart, and asking again when the
    // answer is already a settled no does nothing at all on Android.
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        if (!next.canAskAgain) {
          Alert.alert(
            'Camera access is off',
            'Turn the camera on for OffersOffer in your phone’s settings to scan coupons, or type the code in below.',
          );
        }
        return;
      }
    }
    scanLock.current = false;
    setScanning(true);
  };

  /**
   * A scan yields the deep link the customer's app rendered, with the signed
   * token in `t`. If what was scanned turns out to be some other QR entirely,
   * the whole string goes up as a code and the server refuses it - which is
   * the right answer for a shopkeeper who scanned a milk carton.
   *
   * Read with a regex rather than `URL.searchParams`: React Native's `URL` is
   * a partial implementation and `searchParams` is not dependably there.
   */
  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanning(false);

    const token = /[?&]t=([^&\s]+)/.exec(data)?.[1];
    if (token) runVerify({ qrToken: decodeURIComponent(token), method: 'QR_SCAN' });
    else runVerify({ code: data.trim().slice(0, 32), method: 'QR_SCAN' });
  };

  // ---- Verify and redeem --------------------------------------------------

  const submitCode = () => {
    const typed = code.trim();
    if (!typed) return;
    runVerify({ code: typed, method: 'CODE_ENTRY' });
  };

  const confirmRedemption = () => {
    if (!claim) return;
    redeem.mutate(
      { code: claim.code, method: lastMethod.current },
      {
        onSuccess: (result) => {
          setRedeemed(result);
          setStage('redeemed');
          setCode('');
        },
        // Losing the race to another till is not the shopkeeper's mistake, so
        // it lands on the same screen as any other refusal rather than as an
        // alert over a claim that still looks redeemable.
        onError: (error) => {
          setStage('rejected');
          setRejection(toRejection(error, 'The redemption could not be recorded.'));
        },
      },
    );
  };

  /** The customer changed their mind, or the stock ran out (§32). */
  const declineRedemption = () => {
    if (!claim) return;
    reject.mutate(
      { code: claim.code, reason: 'MERCHANT_DECLINED' },
      { onSettled: () => reset() },
    );
  };

  const reset = () => {
    setStage('idle');
    setClaim(null);
    setRedeemed(null);
    setRejection(null);
    setCode('');
  };

  if (!currentShopId) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ color: colors.textMuted }}>No shop assigned to your account.</Text>
        </View>
      </Screen>
    );
  }

  const card = {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  } as const;

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
        }}
      >
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>Verify claim</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{currentShop?.shopName}</Text>
        </View>
        {hasPermission('VIEW_REDEMPTION_HISTORY') ? (
          <Pressable onPress={() => navigation.navigate('Redemptions')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Redemption history">
            <Ionicons name="receipt-outline" size={24} color={colors.brand} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        {/* Today's Activity (§35). Three counts, because the person reading
            them is also serving the customer in front of them. */}
        {summary.data ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <MetricCard width="31%" label="Claimed" value={summary.data.claimsToday} icon="ticket-outline" />
            <MetricCard width="31%" label="Redeemed" value={summary.data.redemptionsToday} icon="checkmark-circle-outline" tone="success" />
            <MetricCard width="31%" label="Pending" value={summary.data.pending} icon="time-outline" tone="warning" />
          </View>
        ) : null}

        {stage === 'idle' ? (
          <>
            {scanning ? (
              <View style={{ gap: spacing.sm }}>
                <View style={{ borderRadius: radii.md, overflow: 'hidden', aspectRatio: 1, backgroundColor: '#000' }}>
                  <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={onBarcodeScanned}
                  />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
                  Point the camera at the coupon on the customer’s phone.
                </Text>
                <Button label="Stop scanning" onPress={() => setScanning(false)} variant="secondary" />
              </View>
            ) : (
              <View style={[card, { alignItems: 'center', gap: spacing.sm }]}>
                <Ionicons name="qr-code-outline" size={44} color={colors.brand} />
                <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.semibold, textAlign: 'center' }}>
                  Scan the customer’s coupon
                </Text>
                <Button label="Open scanner" onPress={startScan} fullWidth icon={<Ionicons name="camera-outline" size={18} color={colors.textOnBrand} />} />
              </View>
            )}

            {/* §9. Always on screen, never behind a link. */}
            <View style={[card, { gap: spacing.sm }]}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.semibold }}>
                Or enter the code
              </Text>
              <TextField
                value={code}
                onChangeText={setCode}
                placeholder="OFR-XXXXXXXX"
                autoCapitalize="characters"
                autoCorrect={false}
                leftIcon="keypad-outline"
                returnKeyType="go"
                onSubmitEditing={submitCode}
                maxLength={32}
              />
              <Button label="Check code" onPress={submitCode} loading={verify.isPending} disabled={!code.trim()} fullWidth />
            </View>
          </>
        ) : null}

        {stage === 'verified' && claim ? (
          <View style={[card, { borderColor: colors.success, gap: spacing.sm }]}>
            <Badge label="Ready to redeem" tone="success" icon={<Ionicons name="checkmark-circle" size={12} color={colors.success} />} />
            <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold }}>{claim.offer.title}</Text>
            {claim.offer.offerText ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.base }}>{claim.offer.offerText}</Text>
            ) : null}

            <View style={{ gap: 4, marginTop: spacing.xxs }}>
              <DetailRow label="Code" value={claim.code} />
              <DetailRow label="Customer" value={claim.customer.name} />
              {claim.branch ? <DetailRow label="Branch" value={claim.branch.name} /> : null}
              {claim.maxRedemptions > 1 ? (
                <DetailRow label="Used" value={`${claim.redemptionCount} of ${claim.maxRedemptions}`} />
              ) : null}
            </View>

            {canRedeem && claim.canRedeem ? (
              <Button label="Confirm redemption" onPress={confirmRedemption} loading={redeem.isPending} fullWidth />
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                This coupon is valid. Ask someone with redemption rights to complete it.
              </Text>
            )}
            {canRedeem && claim.canRedeem ? (
              <Button label="Not honoured" onPress={declineRedemption} variant="ghost" disabled={busy} fullWidth />
            ) : null}
            <Button label="Check another code" onPress={reset} variant="secondary" disabled={busy} fullWidth />
          </View>
        ) : null}

        {stage === 'redeemed' && redeemed ? (
          <View style={[card, { borderColor: colors.success, alignItems: 'center', gap: spacing.sm }]}>
            <Ionicons name="checkmark-circle" size={52} color={colors.success} />
            <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, textAlign: 'center' }}>
              Redeemed
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.base, textAlign: 'center' }}>
              {redeemed.offer.title} · {redeemed.code}
            </Text>
            <Button label="Verify next customer" onPress={reset} fullWidth />
          </View>
        ) : null}

        {stage === 'rejected' && rejection ? (
          <View
            style={[
              card,
              { borderColor: rejection.unreachable ? colors.warning : colors.danger, alignItems: 'center', gap: spacing.sm },
            ]}
          >
            <Ionicons
              name={rejection.unreachable ? 'cloud-offline-outline' : 'alert-circle'}
              size={48}
              color={rejection.unreachable ? colors.warning : colors.danger}
            />
            <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, textAlign: 'center' }}>
              {rejectionTitle(rejection)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.base, textAlign: 'center' }}>{rejection.message}</Text>
            <Button label="Try again" onPress={reset} fullWidth />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors, fontSizes, fontWeights } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The heading above the server's sentence (§14, §15). The sentence itself is
 * never ours: a wrong-shop code and an invented one are worded identically on
 * purpose, and arrive here with no reason at all.
 */
function rejectionTitle(rejection: ClaimRejection): string {
  if (rejection.unreachable) return 'Could not reach OffersOffer';
  switch (rejection.reason) {
    case 'EXPIRED':
      return 'Offer expired';
    case 'ALREADY_REDEEMED':
      return 'Already redeemed';
    case 'WRONG_BRANCH':
      return 'Wrong branch';
    case 'REVOKED':
    case 'CANCELLED':
      return 'No longer valid';
    default:
      return 'Invalid claim code';
  }
}
