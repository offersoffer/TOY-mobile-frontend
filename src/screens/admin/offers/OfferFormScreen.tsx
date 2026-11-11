import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../theme';
import { Screen, Button, TextField, Chip, LoadingView } from '../../../components/ui';
import { useShopAdmin } from '../../../store/ShopAdminContext';
import { useCategories } from '../../../hooks/useCategories';
import { useBranches } from '../../../hooks/useAdminShop';
import { useManagedOffer, useCreateOffer, useUpdateOffer } from '../../../hooks/useAdminOffers';
import { useShopEntitlements } from '../../../hooks/useSubscription';
import { uploadOfferImage } from '../../../api/uploads';
import { getApiErrorMessage, getPlanUpgradeDetails } from '../../../api/client';
import { UpgradePrompt } from '../../../components/UpgradePrompt';
import type { AdminStackScreenProps } from '../../../navigation/types';
import type { OfferFormValues } from '../../../types/admin';
import type { OfferType } from '../../../types';

type Props = AdminStackScreenProps<'OfferForm'>;

const OFFER_TYPES: Array<{ value: OfferType; label: string }> = [
  { value: 'percentage', label: 'Percentage Discount' },
  { value: 'flat', label: 'Flat Discount' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y' },
  { value: 'price_drop', label: 'Price Drop' },
  { value: 'up_to', label: 'Up To' },
  { value: 'other', label: 'Other' },
];

function emptyForm(shopId: number): OfferFormValues {
  const now = new Date();
  const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    shopId,
    title: '',
    offerType: 'percentage',
    discountType: 'percentage',
    isRecurring: false,
    startDate: now.toISOString(),
    endDate: inAWeek.toISOString(),
    status: 'draft',
    applicabilityType: 'shop_wide',
    branchIds: [],
    images: [],
  };
}

export function OfferFormScreen({ route, navigation }: Props) {
  const { offerId, duplicateFrom } = route.params ?? {};
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { currentShopId } = useShopAdmin();
  const categories = useCategories();
  const branches = useBranches(currentShopId);
  const entitlements = useShopEntitlements(currentShopId);
  const { data: existing, isLoading: loadingExisting } = useManagedOffer(offerId);
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();

  const [form, setForm] = useState<OfferFormValues>(duplicateFrom ?? emptyForm(currentShopId ?? 0));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeDetails, setUpgradeDetails] = useState<ReturnType<typeof getPlanUpgradeDetails>>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        shopId: existing.shop.id,
        categoryId: existing.category?.id ?? null,
        title: existing.title,
        productName: existing.productName ?? undefined,
        description: existing.description ?? undefined,
        offerText: existing.offerText ?? undefined,
        offerType: existing.offerType,
        discountType: existing.discountType,
        discountValue: existing.discountValue,
        originalPrice: existing.originalPrice,
        discountedPrice: existing.discountedPrice,
        buyQuantity: existing.buyQuantity,
        getQuantity: existing.getQuantity,
        minPurchase: existing.minPurchase,
        termsConditions: existing.termsConditions ?? undefined,
        eligibility: existing.eligibility ?? undefined,
        usageRestrictions: existing.usageRestrictions ?? undefined,
        applicableProducts: existing.applicableProducts ?? undefined,
        isRecurring: existing.isRecurring,
        recurrenceType: existing.recurrenceType,
        startDate: existing.startDate,
        endDate: existing.endDate,
        status: existing.status === 'active' || existing.status === 'scheduled' ? existing.status : 'draft',
        applicabilityType: existing.applicabilityType,
        branchIds: existing.branchIds ?? [],
        images: existing.images?.map((img) => ({ url: img.url, thumbnailUrl: img.thumbnailUrl ?? undefined })) ?? [],
      });
    }
  }, [existing]);

  const set = <K extends keyof OfferFormValues>(key: K, value: OfferFormValues[K]) => setForm((f) => ({ ...f, [key]: value }));

  const canSchedule = entitlements.data?.features.includes('OFFER_SCHEDULING') ?? false;
  const canRecur = entitlements.data?.features.includes('RECURRING_OFFERS') ?? false;

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const uploaded = await uploadOfferImage(asset.uri, asset.fileName ?? 'offer.jpg', asset.mimeType ?? 'image/jpeg');
      set('images', [...form.images, { url: uploaded.url, thumbnailUrl: uploaded.thumbnailUrl ?? undefined }]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not upload image.'));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => set('images', form.images.filter((img) => img.url !== url));

  const toggleBranch = (branchId: number) => {
    set('branchIds', form.branchIds.includes(branchId) ? form.branchIds.filter((b) => b !== branchId) : [...form.branchIds, branchId]);
  };

  /**
   * The branches this offer would actually appear at that are not ready, by
   * the same rule the server applies: every active branch for a shop-wide
   * offer, the chosen ones for a targeted offer, and none at all for an
   * online one - an online offer has no counter to walk into.
   *
   * Inactive branches are left out because the gate never checks one, so
   * listing its missing fields would send the merchant off to fix something
   * that was never blocking them.
   */
  const incompleteBranches = (() => {
    if (form.applicabilityType === 'online') return [];
    const active = (branches.data ?? []).filter((b) => b.status === 'active');
    const reached =
      form.applicabilityType === 'shop_wide'
        ? active
        : active.filter((b) => form.branchIds.includes(b.id));
    return reached.filter((b) => (b.publishBlockers?.length ?? 0) > 0);
  })();

  const onSave = (publish: boolean) => {
    setError(null);
    setUpgradeDetails(null);
    const payload: OfferFormValues = { ...form, status: publish ? (isFutureStart(form.startDate) ? 'scheduled' : 'active') : 'draft' };
    const onError = (err: unknown) => {
      const upgrade = getPlanUpgradeDetails(err);
      if (upgrade) setUpgradeDetails(upgrade);
      else setError(getApiErrorMessage(err, 'Could not save this offer.'));
    };
    if (offerId) {
      updateOffer.mutate({ id: offerId, payload }, { onSuccess: () => navigation.goBack(), onError });
    } else {
      createOffer.mutate(payload, { onSuccess: () => navigation.goBack(), onError });
    }
  };

  if (offerId && loadingExisting) return <LoadingView />;

  const saving = createOffer.isPending || updateOffer.isPending;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm, marginBottom: spacing.sm }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>
          {offerId ? 'Edit Offer' : 'Create Offer'}
        </Text>
      </View>

      {upgradeDetails ? (
        <UpgradePrompt details={upgradeDetails} onViewPlan={() => navigation.navigate('Subscription')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl }}>
          <TextField label="Title" value={form.title} onChangeText={(v) => set('title', v)} placeholder="e.g. Buy 2 Get 1 Free" />
          <TextField label="Product Name" value={form.productName ?? ''} onChangeText={(v) => set('productName', v)} />
          <TextField label="Description" value={form.description ?? ''} onChangeText={(v) => set('description', v)} multiline />
          <TextField label="Offer Text (headline)" value={form.offerText ?? ''} onChangeText={(v) => set('offerText', v)} placeholder="e.g. 40% OFF" />

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
              {(categories.data ?? []).map((c) => (
                <Chip key={c.id} label={c.name} selected={form.categoryId === c.id} onPress={() => set('categoryId', c.id)} />
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Offer Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {OFFER_TYPES.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  selected={form.offerType === t.value}
                  onPress={() => {
                    set('offerType', t.value);
                    if (t.value === 'percentage') set('discountType', 'percentage');
                    else if (t.value === 'flat') set('discountType', 'flat');
                  }}
                />
              ))}
            </View>
          </View>

          {(form.offerType === 'percentage' || form.offerType === 'flat') ? (
            <TextField
              label={form.offerType === 'percentage' ? 'Discount %' : 'Flat Discount ₹'}
              value={form.discountValue != null ? String(form.discountValue) : ''}
              onChangeText={(v) => set('discountValue', v ? Number(v) : null)}
              keyboardType="numeric"
            />
          ) : null}

          {form.offerType === 'buy_x_get_y' ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField label="Buy Quantity" value={form.buyQuantity != null ? String(form.buyQuantity) : ''} onChangeText={(v) => set('buyQuantity', v ? Number(v) : null)} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Get Quantity" value={form.getQuantity != null ? String(form.getQuantity) : ''} onChangeText={(v) => set('getQuantity', v ? Number(v) : null)} keyboardType="numeric" />
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="Original Price" value={form.originalPrice != null ? String(form.originalPrice) : ''} onChangeText={(v) => set('originalPrice', v ? Number(v) : null)} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Discounted Price" value={form.discountedPrice != null ? String(form.discountedPrice) : ''} onChangeText={(v) => set('discountedPrice', v ? Number(v) : null)} keyboardType="numeric" />
            </View>
          </View>

          <TextField label="Terms & Conditions" value={form.termsConditions ?? ''} onChangeText={(v) => set('termsConditions', v)} multiline />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Recurring Offer</Text>
              {!canRecur ? <Text style={{ color: colors.textSubtle, fontSize: fontSizes.xs }}>Requires Business plan or higher</Text> : null}
            </View>
            <Switch
              value={form.isRecurring}
              onValueChange={(v) => set('isRecurring', v && canRecur)}
              disabled={!canRecur}
              trackColor={{ false: colors.border, true: colors.brand }}
            />
          </View>
          {form.isRecurring ? (
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {(['daily', 'weekly', 'monthly'] as const).map((r) => (
                <Chip key={r} label={r} selected={form.recurrenceType === r} onPress={() => set('recurrenceType', r)} />
              ))}
            </View>
          ) : null}

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Applies To</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Chip label="Whole Shop" selected={form.applicabilityType === 'shop_wide'} onPress={() => set('applicabilityType', 'shop_wide')} />
              <Chip label="Selected Branches" selected={form.applicabilityType === 'selected_branches'} onPress={() => set('applicabilityType', 'selected_branches')} />
              <Chip label="Online Only" selected={form.applicabilityType === 'online'} onPress={() => set('applicabilityType', 'online')} />
            </View>
            {form.applicabilityType === 'selected_branches' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs }}>
                {(branches.data ?? []).map((b) => (
                  <Chip key={b.id} label={b.branchName} selected={form.branchIds.includes(b.id)} onPress={() => toggleBranch(b.id)} />
                ))}
              </View>
            ) : null}

            {/*
              §18: which of the branches this offer would appear at are not
              ready, before the merchant presses Publish rather than only in
              the 422 that comes back from it. The server still decides -
              this is the same list it would send - but a long form on a
              phone is a bad place to learn the problem is on another screen.
            */}
            {incompleteBranches.length > 0 ? (
              <View
                style={{
                  marginTop: spacing.xs,
                  padding: spacing.sm,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.warning,
                  backgroundColor: colors.warningBg,
                  gap: spacing.xxs,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, fontSize: fontSizes.sm }}>
                  These branches need completing before this offer can go live
                </Text>
                {incompleteBranches.map((branch) => (
                  <Text key={branch.id} style={{ color: colors.text, fontSize: fontSizes.sm }}>
                    •  {branch.branchName} — {(branch.publishBlockers ?? []).map((b) => b.label).join(', ')}
                  </Text>
                ))}
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                  Open Branches and fill in the missing details, or deactivate a branch that is not
                  trading. You can still save this offer as a draft.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>Images</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {form.images.map((img) => (
                <View key={img.url} style={{ position: 'relative' }}>
                  <View style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }} />
                  <Pressable onPress={() => removeImage(img.url)} style={{ position: 'absolute', top: -6, right: -6, backgroundColor: colors.danger, borderRadius: 10, padding: 2 }}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={pickImage} disabled={uploading} style={{ width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={uploading ? 'hourglass-outline' : 'add'} size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {!canSchedule && form.status !== 'draft' ? (
            <Text style={{ color: colors.warning, fontSize: fontSizes.xs }}>
              Scheduling future offers requires Business plan or higher — this offer will publish immediately.
            </Text>
          ) : null}

          {error ? <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="Save as Draft" variant="secondary" onPress={() => onSave(false)} loading={saving} style={{ flex: 1 }} />
            <Button label="Publish" onPress={() => onSave(true)} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function isFutureStart(startDate: string): boolean {
  return new Date(startDate).getTime() > Date.now() + 60_000;
}
