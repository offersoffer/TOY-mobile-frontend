import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme';
import { Screen, Button, TextField, LoadingView } from '../../components/ui';
import { Stepper, type WizardStep } from '../../components/Stepper';
import { TileMapPicker, type PickedLocation } from '../../components/TileMapPicker';
import { useAuth } from '../../store/AuthContext';
import { useCategories } from '../../hooks/useCategories';
import {
  useMyRegistrations,
  useSaveRegistration,
  useStartRegistration,
  useSubmitRegistration,
} from '../../hooks/useOnboarding';
import { getApiErrorMessage } from '../../api/client';
import { formatDate } from '../../utils/format';
import type {
  DuplicateCandidate,
  LocationSource,
  Registration,
  RegistrationPayload,
  ShopClaim,
} from '../../types';
import { onboardingApi } from '../../api';
import type { RootStackScreenProps } from '../../navigation/types';
import { RegistrationStatus } from './RegistrationStatus';

type Props = RootStackScreenProps<'SellerOnboarding'>;

const STEPS: WizardStep[] = [
  { key: 'contact', label: 'Your details' },
  { key: 'shop', label: 'Shop details' },
  { key: 'location', label: 'Address & map' },
  { key: 'verification', label: 'Verification', optional: true },
  { key: 'listings', label: 'First offer', optional: true },
  { key: 'review', label: 'Review' },
];

interface Fields {
  contactNumber: string;
  name: string;
  description: string;
  email: string;
  websiteUrl: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  googleBusinessUrl: string;
  businessRegistrationNumber: string;
}

const EMPTY: Fields = {
  contactNumber: '',
  name: '',
  description: '',
  email: '',
  websiteUrl: '',
  address: '',
  area: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  googleBusinessUrl: '',
  businessRegistrationNumber: '',
};

const PHONE = /^[+\d][\d\s-]{5,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE = /^\d{6}$/;

/**
 * Self-service seller registration (Self-Service Onboarding §4-§12).
 *
 * The mobile half of `TOY-frontend/src/app/features/seller/`. Six steps saved
 * to the server one at a time, because §4 requires a seller to be able to
 * leave and come back and on a phone "leaving" includes the OS reclaiming the
 * app in the background - a draft held in component state would not survive
 * a phone call.
 *
 * Nothing here is a security control. Every rule it applies - what may be
 * edited, what is required, whether the map pin counts - is enforced again by
 * the API, and §13 is explicit that hiding something in the client is never
 * the access check. This exists so a shopkeeper does not discover at the end
 * that step three was wrong.
 */
export function SellerOnboardingScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /** §16: shops we already have that might be the one being registered. */
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [claiming, setClaiming] = useState<DuplicateCandidate | null>(null);
  const [claimReason, setClaimReason] = useState('');
  const [claimSending, setClaimSending] = useState(false);
  const [claimed, setClaimed] = useState<ShopClaim | null>(null);

  /**
   * §16: requests already waiting on a reviewer.
   *
   * Without this the request is write-only - the confirmation shows once and
   * a seller who leaves the app has no way to tell whether anything is
   * happening, which is exactly the state that produces a second
   * registration for the same shop.
   */
  const [openClaims, setOpenClaims] = useState<ShopClaim[]>([]);
  const [withdrawing, setWithdrawing] = useState<number | null>(null);

  /** Where the pin came from and whether the seller confirmed it (§7). */
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource>('MANUAL');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const categories = useCategories();
  const mine = useMyRegistrations();
  const startRegistration = useStartRegistration();
  const saveRegistration = useSaveRegistration(registration?.shopId ?? null);
  const submitRegistration = useSubmitRegistration(registration?.shopId ?? null);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setFields((current) => ({ ...current, [key]: value }));

  /** Fills the form from a registration the seller already started (§4). */
  useEffect(() => {
    if (hydrated || mine.isLoading || !mine.data) return;
    setHydrated(true);

    const open = mine.data[0];
    if (!open) return;

    setRegistration(open);
    setFields((current) => ({
      ...current,
      contactNumber: open.contactNumber ?? '',
      name: open.name ?? '',
      description: open.description ?? '',
      email: open.email ?? '',
      websiteUrl: open.websiteUrl ?? '',
      address: open.address?.address ?? '',
      area: open.address?.area ?? '',
      city: open.address?.city ?? '',
      state: open.address?.state ?? '',
      pincode: open.address?.pincode ?? '',
    }));
    setCategoryIds(open.categoryIds ?? []);

    if (open.address) {
      setLatitude(open.address.latitude);
      setLongitude(open.address.longitude);
      setLocationSource(open.address.locationSource ?? 'MANUAL');
      // Straight from the server's own verdict. Deriving "confirmed" on the
      // client is how a pin that was only selected ends up looking confirmed.
      setLocationConfirmed(open.address.locationState === 'CONFIRMED');
    }

    // Drop the seller back where the registration actually stands, rather
    // than at step one, which would make resuming feel like starting again.
    const resumeAt = !open.address?.address ? 2 : STEPS.length - 1;
    setStep(resumeAt);
    setFurthest(resumeAt);
  }, [hydrated, mine.isLoading, mine.data]);

  /*
    Loaded once on entry. Only PENDING is kept: a decided claim arrives as a
    notification, and an approved one shows up as a shop the seller can
    manage, so listing those here would leave a list that never empties.
  */
  useEffect(() => {
    let live = true;
    onboardingApi
      .myClaims()
      .then((claims) => live && setOpenClaims(claims.filter((claim) => claim.status === 'PENDING')))
      .catch(() => live && setOpenClaims([]));
    return () => {
      live = false;
    };
  }, []);

  const withdrawClaim = (claim: ShopClaim) => {
    setWithdrawing(claim.id);
    onboardingApi
      .withdrawClaim(claim.id)
      .then(() => {
        setWithdrawing(null);
        setOpenClaims((claims) => claims.filter((c) => c.id !== claim.id));
        if (claimed?.id === claim.id) setClaimed(null);
      })
      .catch((err) => {
        setWithdrawing(null);
        setError(getApiErrorMessage(err, 'We could not withdraw that request. Please try again.'));
      });
  };

  /**
   * §16: look for a shop we already have as the seller types the name.
   *
   * Debounced, and the answer to a stale request is discarded - a name typed
   * letter by letter would otherwise cost a request per keystroke, and a slow
   * earlier answer could arrive after a later one and overwrite it.
   */
  const searchToken = useRef(0);
  useEffect(() => {
    const name = fields.name.trim();
    // Only while there is still a choice to make. Once the registration
    // exists the seller has decided to create a new shop.
    if (registration || name.length < 3) {
      setDuplicates([]);
      return;
    }

    const token = ++searchToken.current;
    const timer = setTimeout(() => {
      onboardingApi
        .duplicates({ name, contactNumber: fields.contactNumber.trim() })
        .then((matches) => {
          if (token === searchToken.current) setDuplicates(matches);
        })
        // A failed duplicate check must never block the registration: it is
        // a helpful suggestion, not a gate.
        .catch(() => token === searchToken.current && setDuplicates([]));
    }, 600);

    return () => clearTimeout(timer);
  }, [fields.name, fields.contactNumber, registration]);

  const sendClaim = () => {
    const candidate = claiming;
    const reason = claimReason.trim();
    if (!candidate || reason.length < 20) return;

    setClaimSending(true);
    onboardingApi
      .claimShop(candidate.shopId, reason, fields.contactNumber.trim())
      .then((claim) => {
        setClaimSending(false);
        setClaiming(null);
        setClaimed(claim);
        // So it is still there if the seller comes back to this screen.
        setOpenClaims((claims) => [claim, ...claims.filter((c) => c.id !== claim.id)]);
      })
      .catch((err) => {
        setClaimSending(false);
        setError(getApiErrorMessage(err, 'We could not send that request. Please try again.'));
      });
  };

  const stepKey = STEPS[step]?.key ?? 'contact';

  /**
   * §7: the step cannot be completed on a pin alone.
   *
   * Both halves, because they fail separately - a confirmation with no
   * coordinates means the provider never returned one, which §7 says must not
   * count as confirmed.
   */
  const locationReady = locationConfirmed && latitude !== null && longitude !== null;
  const locationState = latitude === null
    ? 'NOT_SELECTED'
    : locationConfirmed
      ? 'CONFIRMED'
      : 'PIN_SELECTED_NOT_CONFIRMED';

  /** The address as typed, to seed the map's search box. */
  const addressHint = useMemo(
    () => [fields.address, fields.area, fields.city, fields.pincode].filter(Boolean).join(', '),
    [fields.address, fields.area, fields.city, fields.pincode],
  );

  /** Per-field problems for the step being filled in. */
  const problems = useMemo<Partial<Record<keyof Fields, string>>>(() => {
    const found: Partial<Record<keyof Fields, string>> = {};
    if (stepKey === 'contact') {
      if (!fields.contactNumber.trim()) found.contactNumber = 'A contact number is required';
      else if (!PHONE.test(fields.contactNumber.trim())) found.contactNumber = 'Enter a valid contact number';
    }
    if (stepKey === 'shop') {
      if (fields.name.trim().length < 2) found.name = 'Enter your shop name';
      if (fields.description.trim().length < 10) found.description = 'Describe your shop in a sentence or two';
      if (fields.email.trim() && !EMAIL.test(fields.email.trim())) found.email = 'Enter a valid email address';
    }
    if (stepKey === 'location') {
      if (fields.address.trim().length < 5) found.address = 'Enter the street address';
      if (fields.city.trim().length < 2) found.city = 'Enter the city or town';
      if (fields.state.trim().length < 2) found.state = 'Enter the state';
      if (!PINCODE.test(fields.pincode.trim())) found.pincode = 'Enter a 6-digit pincode';
    }
    return found;
  }, [stepKey, fields]);

  const canContinue =
    Object.keys(problems).length === 0 &&
    (stepKey !== 'shop' || categoryIds.length > 0) &&
    (stepKey !== 'location' || locationReady);

  const show = (key: keyof Fields) => (touched ? problems[key] : undefined);

  const toggleCategory = (id: number) =>
    setCategoryIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  /**
   * §7, §10: the seller confirmed a pin, so it wins over anything the
   * geocoder would work out from the address.
   *
   * Address fields are filled only where they are still empty - what the
   * seller typed is what they meant, and letting the map quietly rewrite it is
   * how a correct pin ends up attached to a wrong address.
   */
  const onPicked = (location: PickedLocation) => {
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setLocationSource(location.source);
    setLocationAccuracy(location.accuracy);
    setLocationConfirmed(true);

    const picked = location.address;
    if (!picked) return;
    setFields((current) => ({
      ...current,
      area: current.area.trim() || picked.area || '',
      city: current.city.trim() || picked.city || '',
      state: current.state.trim() || picked.state || '',
      pincode: current.pincode.trim() || picked.pincode || '',
    }));
  };

  /**
   * §7's middle state: a pin exists but nobody has vouched for it.
   *
   * Recorded so the banner can say "now press Confirm" and - just as
   * important - so `locationReady` stays false. Coordinates on their own are
   * not a confirmation, and §7 is explicit that they must never be treated as
   * one.
   */
  const onPinMoved = useCallback(
    (pin: { latitude: number; longitude: number; source: LocationSource; accuracy: number | null }) => {
      setLatitude(pin.latitude);
      setLongitude(pin.longitude);
      setLocationSource(pin.source);
      setLocationAccuracy(pin.accuracy);
      setLocationConfirmed(false);
    },
    [],
  );

  const payloadForStep = (): RegistrationPayload => {
    switch (stepKey) {
      case 'contact':
        return { contactNumber: fields.contactNumber.trim() };
      case 'shop':
        return {
          name: fields.name.trim(),
          description: fields.description.trim(),
          email: fields.email.trim() || null,
          websiteUrl: fields.websiteUrl.trim() || null,
          categoryIds,
        };
      case 'location':
        return {
          address: {
            address: fields.address.trim(),
            area: fields.area.trim() || null,
            city: fields.city.trim(),
            state: fields.state.trim(),
            pincode: fields.pincode.trim(),
            country: 'India',
            latitude,
            longitude,
            locationSource,
            locationAccuracy,
            locationConfirmed,
          },
        };
      case 'verification':
        return {
          verification: {
            gstin: fields.gstin.trim() || null,
            googleBusinessUrl: fields.googleBusinessUrl.trim() || null,
            businessRegistrationNumber: fields.businessRegistrationNumber.trim() || null,
          },
        };
      default:
        return {};
    }
  };

  const advance = () => {
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setFurthest((current) => Math.max(current, next));
    setTouched(false);
  };

  /** Saves this step, then advances. §4: progress survives leaving. */
  const onNext = () => {
    if (!canContinue) {
      setTouched(true);
      return;
    }
    setError(null);

    /**
     * Nothing is created until there is something to register.
     *
     * Step one collects only the shop's phone number, and a registration made
     * from that alone would have to carry a placeholder name and no category -
     * which the API rightly rejects, because both are required to create a
     * shop. So the first step is held locally and the row is created when the
     * shop details are saved, carrying both steps at once.
     */
    if (!registration && stepKey === 'contact') {
      advance();
      return;
    }

    const onSuccess = (saved: Registration) => {
      setRegistration(saved);
      advance();
    };
    // §24: the step stays filled in, so a failed save costs a retry and not
    // the seller's typing.
    const onError = (err: unknown) =>
      setError(getApiErrorMessage(err, 'We could not save that step. Please try again.'));

    if (registration) {
      saveRegistration.mutate(payloadForStep(), { onSuccess, onError });
    } else {
      startRegistration.mutate(
        {
          name: fields.name.trim(),
          description: fields.description.trim(),
          contactNumber: fields.contactNumber.trim(),
          email: fields.email.trim() || null,
          websiteUrl: fields.websiteUrl.trim() || null,
          categoryIds,
        },
        { onSuccess, onError },
      );
    }
  };

  const onSubmit = () => {
    if (!registration || !acceptedTerms || !locationReady) return;
    setError(null);
    submitRegistration.mutate(undefined, {
      onSuccess: (saved) => {
        setRegistration(saved);
        // The membership is now a submitted registration rather than a draft,
        // and §12's status screen is driven by what the server says, so pull
        // the account down again rather than guessing at it locally.
        void refreshUser();
      },
      onError: (err) =>
        setError(getApiErrorMessage(err, 'We could not submit your registration. Please try again.')),
    });
  };

  const saving = startRegistration.isPending || saveRegistration.isPending;

  const header = (title: string) => (
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
      <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Close">
        <Ionicons name="close" size={22} color={colors.text} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>{title}</Text>
    </View>
  );

  if (mine.isLoading) {
    return (
      <Screen>
        {header('Register your shop')}
        <LoadingView />
      </Screen>
    );
  }

  // §12: once submitted, the wizard gives way to a status the seller can act
  // on, which says plainly what they can and cannot do yet.
  if (registration && !registration.canEdit) {
    return (
      <Screen>
        {header('Your registration')}
        <RegistrationStatus registration={registration} onClose={() => navigation.goBack()} />
      </Screen>
    );
  }

  const sectionTitle = (text: string, optional = false) => (
    <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>
      {text}
      {optional ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: fontWeights.regular }}>
          {'  '}(optional)
        </Text>
      ) : null}
    </Text>
  );

  const muted = (text: string) => (
    <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 19 }}>{text}</Text>
  );

  return (
    <Screen>
      {header('Register your shop')}

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Stepper
          steps={STEPS}
          current={step}
          furthest={furthest}
          onStepPress={(index) => {
            setTouched(false);
            setStep(index);
          }}
        />

        {error ? (
          <View
            style={{
              padding: spacing.sm,
              borderRadius: radii.sm,
              backgroundColor: colors.dangerBg,
              borderWidth: 1,
              borderColor: colors.danger,
            }}
          >
            <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>{error}</Text>
          </View>
        ) : null}

        {/*
          §16: requests already waiting on a reviewer. Above the steps rather
          than inside the details step, because its whole job is to be seen
          before the seller starts typing the same shop in again.
        */}
        {openClaims.length ? (
          <View
            style={{
              padding: spacing.sm,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.warning,
              backgroundColor: colors.warningBg,
              gap: spacing.xs,
            }}
          >
            <Text
              style={{ color: colors.warning, fontWeight: fontWeights.bold, fontSize: fontSizes.md }}
            >
              You have already asked to manage{' '}
              {openClaims.length === 1 ? 'a shop' : `${openClaims.length} shops`}
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 19 }}>
              Our team is checking {openClaims.length === 1 ? 'it' : 'them'}. You do not have access
              yet. Carry on below only if you want to register a different shop.
            </Text>

            {openClaims.map((claim) => (
              <View
                key={claim.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.sm,
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
                    {claim.shopName}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                    Requested {formatDate(claim.createdAt)}
                  </Text>
                </View>
                <Button
                  label={withdrawing === claim.id ? 'Withdrawing…' : 'Withdraw'}
                  variant="ghost"
                  size="sm"
                  disabled={withdrawing === claim.id}
                  onPress={() => withdrawClaim(claim)}
                />
              </View>
            ))}
          </View>
        ) : null}

        {/* 1 ---------------------------------------------------------------- */}
        {stepKey === 'contact' ? (
          <View style={{ gap: spacing.sm }}>
            {sectionTitle('Your details')}
            {muted(
              `You are registering as ${user?.name ?? 'your account'} (${user?.email ?? ''}). We need a number customers can reach the shop on.`,
            )}
            <TextField
              label="Shop contact number *"
              value={fields.contactNumber}
              onChangeText={(value) => set('contactNumber', value)}
              error={show('contactNumber')}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
              leftIcon="call-outline"
            />
          </View>
        ) : null}

        {/* 2 ---------------------------------------------------------------- */}
        {stepKey === 'shop' ? (
          <View style={{ gap: spacing.sm }}>
            {sectionTitle('Shop details')}

            {/*
              §16: before a second copy of a shop gets created. Here rather
              than as a step of its own, because the only thing that makes
              the search useful is the shop's name, and this is where the
              seller types it.
            */}
            {claimed ? (
              <View
                style={{
                  padding: spacing.sm,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.success,
                  backgroundColor: colors.successBg,
                  gap: spacing.xxs,
                }}
              >
                <Text style={{ color: colors.success, fontWeight: fontWeights.bold, fontSize: fontSizes.md }}>
                  We have your request for {claimed.shopName}
                </Text>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 19 }}>
                  Our team will check it and let you know. You do not have access to that shop yet,
                  and you can keep filling this in if you would rather register a new one.
                </Text>
              </View>
            ) : duplicates.length ? (
              <View
                style={{
                  padding: spacing.sm,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.info,
                  backgroundColor: colors.infoBg,
                  gap: spacing.xs,
                }}
              >
                <Text style={{ color: colors.info, fontWeight: fontWeights.bold, fontSize: fontSizes.md }}>
                  We may already have your shop
                </Text>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 19 }}>
                  If one of these is yours, ask for access instead of creating a second listing —
                  you keep the reviews and offers already on it.
                </Text>

                {duplicates.map((candidate) => (
                  <View
                    key={candidate.shopId}
                    style={{
                      padding: spacing.sm,
                      borderRadius: radii.sm,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      gap: spacing.xxs,
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
                      {candidate.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                      {candidate.city ?? 'Location unknown'}
                      {candidate.pincode ? ` · ${candidate.pincode}` : ''} · matched on{' '}
                      {candidate.matchedOn.join(', ')}
                    </Text>
                    {candidate.alreadyYours ? (
                      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                        You already manage this
                      </Text>
                    ) : candidate.claimPending ? (
                      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                        Request already sent
                      </Text>
                    ) : (
                      <Button
                        label="This is my shop"
                        variant="secondary"
                        size="sm"
                        onPress={() => {
                          setClaiming(candidate);
                          setClaimReason('');
                        }}
                      />
                    )}
                  </View>
                ))}

                {claiming ? (
                  <View style={{ gap: spacing.xs, paddingTop: spacing.xs }}>
                    <TextField
                      label={`How is ${claiming.name} yours? *`}
                      value={claimReason}
                      onChangeText={setClaimReason}
                      multiline
                      numberOfLines={3}
                      style={{ minHeight: 76, textAlignVertical: 'top' }}
                      placeholder="e.g. I am the owner. The shop has been in my family since 1998 and I have the GST certificate."
                    />
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                      Our team reads this and checks before giving anyone access. Nothing changes
                      until they do.
                    </Text>
                    <Button
                      label={claimSending ? 'Sending…' : 'Send the request'}
                      onPress={sendClaim}
                      disabled={claimReason.trim().length < 20 || claimSending}
                      fullWidth
                    />
                    <Button
                      label="Cancel"
                      variant="ghost"
                      onPress={() => setClaiming(null)}
                      fullWidth
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            <TextField
              label="Shop name *"
              value={fields.name}
              onChangeText={(value) => set('name', value)}
              error={show('name')}
              placeholder="e.g. Vaigai Silks"
            />
            <TextField
              label="What do you sell? *"
              value={fields.description}
              onChangeText={(value) => set('description', value)}
              error={show('description')}
              multiline
              numberOfLines={4}
              style={{ minHeight: 88, textAlignVertical: 'top' }}
              placeholder="A sentence or two about your shop"
            />

            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>
                Categories *
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs }}>
                {(categories.data ?? []).map((category) => {
                  const selected = categoryIds.includes(category.id);
                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => toggleCategory(category.id)}
                      style={{
                        paddingVertical: spacing.xxs + 2,
                        paddingHorizontal: spacing.sm,
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: selected ? colors.brand : colors.border,
                        backgroundColor: selected ? colors.brandLight : colors.surface,
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? colors.brandStrong : colors.text,
                          fontSize: fontSizes.sm,
                          fontWeight: selected ? fontWeights.semibold : fontWeights.regular,
                        }}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {touched && !categoryIds.length ? (
                <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>Choose at least one.</Text>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Choose at least one.</Text>
              )}
            </View>

            <TextField
              label="Shop email"
              value={fields.email}
              onChangeText={(value) => set('email', value)}
              error={show('email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextField
              label="Website or social link"
              value={fields.websiteUrl}
              onChangeText={(value) => set('websiteUrl', value)}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://"
            />
          </View>
        ) : null}

        {/* 3 ---------------------------------------------------------------- */}
        {stepKey === 'location' ? (
          <View style={{ gap: spacing.sm }}>
            {sectionTitle('Where is your shop?')}
            {muted('Customers find you by how close you are, so this is the step that matters most.')}

            <TextField
              label="Street address *"
              value={fields.address}
              onChangeText={(value) => set('address', value)}
              error={show('address')}
            />
            <TextField label="Area or locality" value={fields.area} onChangeText={(value) => set('area', value)} />
            <TextField
              label="City or town *"
              value={fields.city}
              onChangeText={(value) => set('city', value)}
              error={show('city')}
            />
            <TextField
              label="State *"
              value={fields.state}
              onChangeText={(value) => set('state', value)}
              error={show('state')}
            />
            <TextField
              label="Pincode *"
              value={fields.pincode}
              onChangeText={(value) => set('pincode', value)}
              error={show('pincode')}
              keyboardType="number-pad"
              maxLength={6}
            />

            {/* §7: selected and confirmed are different things, and the UI must
                never show the second before the seller has done it. Icon, words
                and colour, in that order (§23 forbids colour alone). */}
            <View
              accessibilityRole="summary"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                padding: spacing.sm,
                borderRadius: radii.sm,
                backgroundColor:
                  locationState === 'CONFIRMED'
                    ? colors.successBg
                    : locationState === 'PIN_SELECTED_NOT_CONFIRMED'
                      ? colors.infoBg
                      : colors.surfaceAlt,
              }}
            >
              <Ionicons
                name={
                  locationState === 'CONFIRMED'
                    ? 'checkmark-circle-outline'
                    : locationState === 'PIN_SELECTED_NOT_CONFIRMED'
                      ? 'alert-circle-outline'
                      : 'location-outline'
                }
                size={18}
                color={
                  locationState === 'CONFIRMED'
                    ? colors.success
                    : locationState === 'PIN_SELECTED_NOT_CONFIRMED'
                      ? colors.info
                      : colors.textMuted
                }
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: fontSizes.sm,
                  fontWeight: locationState === 'CONFIRMED' ? fontWeights.semibold : fontWeights.regular,
                  color:
                    locationState === 'CONFIRMED'
                      ? colors.success
                      : locationState === 'PIN_SELECTED_NOT_CONFIRMED'
                        ? colors.info
                        : colors.textMuted,
                }}
              >
                {locationState === 'CONFIRMED'
                  ? 'Location confirmed'
                  : locationState === 'PIN_SELECTED_NOT_CONFIRMED'
                    ? 'Pin placed — press Confirm location on the map below'
                    : 'No location selected yet. Search for your address or drag the pin.'}
              </Text>
            </View>

            <TileMapPicker
              latitude={latitude}
              longitude={longitude}
              addressHint={latitude != null ? undefined : addressHint}
              onPinMoved={onPinMoved}
              onConfirm={onPicked}
            />

            {muted(
              'You never need to type latitude or longitude. Searching, dragging the pin, or using your current location all work — and you can keep going without granting location permission.',
            )}
          </View>
        ) : null}

        {/* 4 ---------------------------------------------------------------- */}
        {stepKey === 'verification' ? (
          <View style={{ gap: spacing.sm }}>
            {sectionTitle('Business verification', true)}
            {muted(
              'Anything here helps us verify your shop faster. None of it is required — plenty of small businesses have none of these, and that is fine. Only our review team can see what you enter.',
            )}
            <TextField
              label="GSTIN"
              value={fields.gstin}
              onChangeText={(value) => set('gstin', value.toUpperCase())}
              autoCapitalize="characters"
              placeholder="33AABCU9603R1ZX"
            />
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              Only if your business is GST registered.
            </Text>
            <TextField
              label="Google Business Profile link"
              value={fields.googleBusinessUrl}
              onChangeText={(value) => set('googleBusinessUrl', value)}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://"
            />
            <TextField
              label="Business registration number"
              value={fields.businessRegistrationNumber}
              onChangeText={(value) => set('businessRegistrationNumber', value)}
            />
          </View>
        ) : null}

        {/* 5 ---------------------------------------------------------------- */}
        {stepKey === 'listings' ? (
          <View style={{ gap: spacing.sm }}>
            {sectionTitle('Your first offer', true)}
            <Text style={{ color: colors.text, fontSize: fontSizes.md, lineHeight: 21 }}>
              You can add offers and services at any time once your shop is verified. Nothing you
              create goes public before then, so there is no rush to do it now.
            </Text>
            {muted(
              'Most shopkeepers find it easier to finish registering first, then add offers with the full editor — it has image upload and scheduling, which this step does not.',
            )}
          </View>
        ) : null}

        {/* 6 ---------------------------------------------------------------- */}
        {stepKey === 'review' ? (
          <View style={{ gap: spacing.sm }}>
            {sectionTitle('Review and submit')}

            <ReviewGroup
              title="Your details"
              rows={[
                ['Account', `${user?.name ?? ''}${user?.email ? ` · ${user.email}` : ''}`],
                ['Shop contact', fields.contactNumber],
              ]}
            />
            <ReviewGroup
              title="Shop"
              rows={[
                ['Name', fields.name],
                ['What you sell', fields.description],
                [
                  'Categories',
                  categoryIds
                    .map((id) => categories.data?.find((c) => c.id === id)?.name ?? `#${id}`)
                    .join(', '),
                ],
              ]}
            />
            <ReviewGroup
              title="Address"
              rows={[
                [
                  'Address',
                  [fields.address, fields.area, `${fields.city}, ${fields.state} ${fields.pincode}`]
                    .filter(Boolean)
                    .join('\n'),
                ],
                ['Map location', locationReady ? 'Confirmed' : 'Not confirmed — go back to step 3'],
              ]}
              problem={locationReady ? undefined : 'Map location'}
            />

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xs }}>
              <Switch
                value={acceptedTerms}
                onValueChange={setAcceptedTerms}
                accessibilityLabel="Accept the terms and conditions and privacy policy"
                trackColor={{ true: colors.brand, false: colors.borderStrong }}
              />
              <Text style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm, lineHeight: 19 }}>
                I accept the{' '}
                <Text
                  accessibilityRole="link"
                  onPress={() => navigation.navigate('Legal', { document: 'terms' })}
                  style={{ color: colors.brand, fontWeight: fontWeights.semibold }}
                >
                  Terms &amp; Conditions
                </Text>{' '}
                and the{' '}
                <Text
                  accessibilityRole="link"
                  onPress={() => navigation.navigate('Legal', { document: 'privacy' })}
                  style={{ color: colors.brand, fontWeight: fontWeights.semibold }}
                >
                  Privacy Policy
                </Text>
                , and confirm I am authorised to register this business.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          {step > 0 ? (
            <Button
              label="Back"
              variant="ghost"
              onPress={() => {
                setTouched(false);
                setStep(step - 1);
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            {stepKey === 'review' ? (
              <Button
                label={submitRegistration.isPending ? 'Submitting…' : 'Submit for verification'}
                onPress={onSubmit}
                disabled={!acceptedTerms || !locationReady || submitRegistration.isPending}
                fullWidth
              />
            ) : (
              <Button
                label={saving ? 'Saving…' : 'Save and continue'}
                onPress={onNext}
                disabled={saving}
                fullWidth
              />
            )}
          </View>
        </View>

        {registration ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, textAlign: 'center' }}>
            ✓ Saved. You can close this and come back later.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ReviewGroup({
  title,
  rows,
  problem,
}: {
  title: string;
  rows: [string, string][];
  problem?: string;
}) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  return (
    <View
      style={{
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.sm,
        gap: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {rows.map(([label, value]) => (
        <View key={label} style={{ gap: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
          <Text
            style={{
              color: problem === label ? colors.danger : colors.text,
              fontSize: fontSizes.sm,
            }}
          >
            {value || '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}
