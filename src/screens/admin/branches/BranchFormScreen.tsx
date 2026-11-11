import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Screen, Button, TextField } from '../../../components/ui';
import { useShopAdmin } from '../../../store/ShopAdminContext';
import { useBranches, useCreateBranch, useUpdateBranch, useDeactivateBranch } from '../../../hooks/useAdminShop';
import { MapLocationPicker, type PickedLocation } from '../../../components/MapLocationPicker';
import { getApiErrorMessage, getPlanUpgradeDetails } from '../../../api/client';
import { UpgradePrompt } from '../../../components/UpgradePrompt';
import type { AdminStackScreenProps } from '../../../navigation/types';
import type { BranchFormValues } from '../../../types/admin';

type Props = AdminStackScreenProps<'BranchForm'>;

export function BranchFormScreen({ route, navigation }: Props) {
  const { branchId } = route.params ?? {};
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { currentShopId } = useShopAdmin();
  const branches = useBranches(currentShopId);
  const existing = branches.data?.find((b) => b.id === branchId);
  const createBranch = useCreateBranch(currentShopId);
  const updateBranch = useUpdateBranch(currentShopId);
  const deactivateBranch = useDeactivateBranch(currentShopId);
  const [form, setForm] = useState<BranchFormValues>({ branchName: '', city: '', isPrimary: false });
  const [error, setError] = useState<string | null>(null);
  const [upgradeDetails, setUpgradeDetails] = useState<ReturnType<typeof getPlanUpgradeDetails>>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        branchName: existing.branchName,
        address: existing.address ?? undefined,
        addressLine2: existing.addressLine2 ?? undefined,
        area: existing.area ?? undefined,
        city: existing.city ?? '',
        state: existing.state ?? undefined,
        country: existing.country ?? undefined,
        pincode: existing.pincode ?? undefined,
        latitude: existing.latitude ?? undefined,
        longitude: existing.longitude ?? undefined,
        locationSource: existing.locationSource,
        locationAccuracy: existing.locationAccuracy,
        placeId: existing.placeId,
        // Coordinates that are already stored were confirmed when they were
        // saved; §8's confirmation is only owed again once the pin moves.
        locationConfirmed: existing.latitude != null,
        contactNumber: existing.contactNumber ?? undefined,
        contactPersonName: existing.contactPersonName ?? undefined,
        contactPersonEmail: existing.contactPersonEmail ?? undefined,
        isPrimary: existing.isPrimary,
      });
    }
  }, [existing]);

  const set = <K extends keyof BranchFormValues>(key: K, value: BranchFormValues[K]) => setForm((f) => ({ ...f, [key]: value }));

  /**
   * §8, §10: the merchant confirmed a pin, so it wins over anything the
   * geocoder would work out from the address.
   *
   * Address fields are filled in only where they are still empty - what the
   * merchant typed is what they meant, and letting the map quietly rewrite it
   * is how a correct pin ends up attached to a wrong address.
   */
  const onLocationConfirmed = (location: PickedLocation) => {
    setForm((current) => {
      const fill = (value: string | null | undefined, existingValue?: string) =>
        existingValue?.trim() ? existingValue : (value ?? undefined);
      return {
        ...current,
        latitude: location.latitude,
        longitude: location.longitude,
        locationSource: location.source,
        locationAccuracy: location.accuracy,
        placeId: location.placeId,
        locationConfirmed: true,
        address: fill(location.address?.addressLine1, current.address),
        area: fill(location.address?.area, current.area),
        city: current.city.trim() ? current.city : (location.address?.city ?? ''),
        state: fill(location.address?.state, current.state),
        country: fill(location.address?.country, current.country),
        pincode: fill(location.address?.pincode, current.pincode),
      };
    });
  };

  /**
   * What the server says is still missing, read from the response rather than
   * re-derived here: the rule lives in one place, and a copy of it on the
   * device would be the copy that goes stale behind a store release.
   *
   * Only for a branch that exists and is trading - the gate never looks at an
   * inactive one, and a branch being added has nothing to report yet.
   */
  const blockers =
    existing && existing.status === 'active' ? (existing.publishBlockers ?? []) : [];

  /** What to seed the picker's search box with when there is no pin yet. */
  const addressHint =
    form.latitude != null
      ? ''
      : [form.address, form.area, form.city, form.state, form.pincode].filter(Boolean).join(', ');

  const onSave = () => {
    setError(null);
    setUpgradeDetails(null);
    const onErr = (err: unknown) => {
      const upgrade = getPlanUpgradeDetails(err);
      if (upgrade) setUpgradeDetails(upgrade);
      else setError(getApiErrorMessage(err, 'Could not save this branch.'));
    };
    if (branchId) {
      updateBranch.mutate({ branchId, payload: form }, { onSuccess: () => navigation.goBack(), onError: onErr });
    } else {
      createBranch.mutate(form, { onSuccess: () => navigation.goBack(), onError: onErr });
    }
  };

  const onDeactivate = () => {
    if (!branchId) return;
    deactivateBranch.mutate(branchId, { onSuccess: () => navigation.goBack() });
  };

  const saving = createBranch.isPending || updateBranch.isPending;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm, marginBottom: spacing.sm }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>
          {branchId ? 'Edit Branch' : 'Add Branch'}
        </Text>
      </View>

      {upgradeDetails ? (
        <UpgradePrompt details={upgradeDetails} onViewPlan={() => navigation.navigate('Subscription')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
          <TextField label="Branch Name" value={form.branchName} onChangeText={(v) => set('branchName', v)} />
          <TextField label="Address" value={form.address ?? ''} onChangeText={(v) => set('address', v)} />
          <TextField label="Address line 2" value={form.addressLine2 ?? ''} onChangeText={(v) => set('addressLine2', v)} />
          <TextField label="Area / locality" value={form.area ?? ''} onChangeText={(v) => set('area', v)} placeholder="e.g. RS Puram" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="City" value={form.city} onChangeText={(v) => set('city', v)} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="State" value={form.state ?? ''} onChangeText={(v) => set('state', v)} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="Pincode" value={form.pincode ?? ''} onChangeText={(v) => set('pincode', v)} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Contact Number" value={form.contactNumber ?? ''} onChangeText={(v) => set('contactNumber', v)} keyboardType="phone-pad" />
            </View>
          </View>

          {/*
            The person a customer is put through to here, which is not
            necessarily whoever administers the branch.
          */}
          <TextField
            label="Contact Person"
            value={form.contactPersonName ?? ''}
            onChangeText={(v) => set('contactPersonName', v)}
            placeholder="Who a customer asks for"
          />
          <TextField
            label="Contact Person Email"
            value={form.contactPersonEmail ?? ''}
            onChangeText={(v) => set('contactPersonEmail', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/*
            §13: branches get the same map flow as the shop itself. Offers
            attached to this branch inherit these exact coordinates for "near
            me" and distance (§12, §20), so a rough pin costs the merchant
            customers rather than only tidiness.
          */}
          <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>
            Location on the map
          </Text>
          <MapLocationPicker
            latitude={form.latitude ?? null}
            longitude={form.longitude ?? null}
            addressHint={addressHint}
            onConfirm={onLocationConfirmed}
          />
          {form.latitude == null ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              Leave this and the coordinates are worked out from the address on save. Confirm a pin
              here to override that.
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Primary Branch</Text>
            <Switch value={!!form.isPrimary} onValueChange={(v) => set('isPrimary', v)} trackColor={{ false: colors.border, true: colors.brand }} />
          </View>

          {/*
            §18's gate, said where it can be fixed. A warning and not a
            validation error: the gate is on publishing, so a half-finished
            branch still saves, and an inactive one is never checked at all -
            which is the merchant's exit when they cannot complete one.
          */}
          {blockers.length > 0 ? (
            <View
              style={{
                padding: spacing.sm,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.warning,
                backgroundColor: colors.warningBg,
                gap: spacing.xxs,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, fontSize: fontSizes.sm }}>
                Offers cannot go live at this branch yet
              </Text>
              {blockers.map((blocker) => (
                <Text key={blocker.field} style={{ color: colors.text, fontSize: fontSizes.sm }}>
                  •  {blocker.label}
                </Text>
              ))}
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                Fill these in, or deactivate the branch if it is not trading. Saving a
                half-finished branch is fine.
              </Text>
            </View>
          ) : null}

          {error ? <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>{error}</Text> : null}

          <Button label={branchId ? 'Save Changes' : 'Add Branch'} onPress={onSave} loading={saving} fullWidth />
          {branchId ? <Button label="Deactivate Branch" variant="danger" onPress={onDeactivate} fullWidth /> : null}
        </ScrollView>
      )}
    </Screen>
  );
}
