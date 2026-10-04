import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Screen, Button, Chip, EmptyState, ErrorState, LoadingView } from '../../components/ui';
import { getApiErrorMessage, isNetworkError } from '../../api/client';
import { NotificationBell, FeaturedRail, BrandMark } from '../../components';
import { useRankedNearMe } from '../../hooks/useVisibility';
import { toUnifiedListing } from '../../utils/rankedListing';
import { trackListingOpen } from '../../services/analytics/visibilityService';
import { useLocationContext } from '../../services/location/LocationContext';
import { formatDistance } from '../../utils/format';
import type { MainTabScreenProps } from '../../navigation/types';
import type { FeaturedPlacement, UnifiedListing } from '../../types';

type Props = MainTabScreenProps<'NearMe'>;

type TypeFilter = 'all' | 'product' | 'service';

const TYPE_CHIPS: Array<{ label: string; value: TypeFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Offers', value: 'product' },
  { label: 'Services', value: 'service' },
];

function headlineFor(listing: UnifiedListing): string {
  if (listing.offerText) return listing.offerText;
  if (listing.discountType === 'percentage' && listing.discountValue != null) return `${listing.discountValue}% OFF`;
  if (listing.discountType === 'flat' && listing.discountValue != null) return `₹${listing.discountValue} OFF`;
  return 'Special Offer';
}

export function NearMeScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { permissionStatus, coords, requestPermission, locating, locationError, refreshLocation } = useLocationContext();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selected, setSelected] = useState<UnifiedListing | null>(null);

  /**
   * §14's Near Me flow, end to end: nearby shops, active listings, distance,
   * relevance, subscription priority, then fairness and rotation.
   *
   * This replaces the plain distance sort rather than sitting beside it, which
   * is the right call here and was not on the home screen: "Near Me" has one
   * job, and two rails both claiming to be the nearby ones would be a screen
   * that contradicts itself.
   */
  const nearby = useRankedNearMe(50);
  const ranked = nearby.data?.items ?? [];
  const featured = nearby.data?.featured ?? [];

  // The map and the type filter both work in the older shape, and the card
  // does too - so the ranked results are adapted once here rather than
  // threading a second listing type through the whole screen.
  const listings = ranked
    .filter((listing) =>
      typeFilter === 'all'
        ? true
        : typeFilter === 'product'
          ? listing.listingType === 'offer'
          : listing.listingType === 'service_offer',
    )
    .map(toUnifiedListing);
  const pins = listings.filter((l) => l.latitude != null && l.longitude != null);

  const openFeatured = (placement: FeaturedPlacement, position: number) => {
    trackListingOpen(placement, { surface: 'NEAR_ME' }, position);
    if (placement.listingType === 'shop') {
      navigation.navigate('ShopDetail', { shopId: placement.id });
      return;
    }
    if (placement.listingType === 'offer') {
      navigation.navigate('OfferDetail', { offerId: placement.id });
    }
  };

  /*
   * Android refuses to construct a MapView without a Google Maps API key, and
   * it fails at native attach time - an `addViewAt` IllegalStateException that
   * names neither maps nor the key, and takes the screen down with it. Checking
   * the flag app.config.js sets lets the screen show the same listings as a
   * list instead, which is strictly better than a crash and is also what iOS
   * would want if the key were ever scoped to Android alone.
   */
  const mapsAvailable =
    Platform.OS !== 'android' ||
    Boolean((Constants.expoConfig?.extra as { googleMapsConfigured?: boolean } | undefined)?.googleMapsConfigured);

  const openDetails = (listing: UnifiedListing) => {
    if (listing.sourceType === 'product') {
      navigation.navigate('OfferDetail', { offerId: listing.id });
    } else if (listing.serviceId != null) {
      navigation.navigate('ServiceDetail', { serviceId: listing.serviceId });
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, marginBottom: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <BrandMark />
          <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>Near Me</Text>
        </View>
        <NotificationBell />
      </View>

      {/*
        `!coords` guards this too: a customer who declined the permission but
        chose their area by hand has a perfectly good location, and should get
        the map rather than be asked again for something they already declined.
      */}
      {permissionStatus !== 'granted' && !coords ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md }}>
          <Ionicons name="location-outline" size={40} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, textAlign: 'center' }}>
            Turn on location
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
            Enable location access to see offers and services near you on the map.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="Enable Location" onPress={requestPermission} />
            <Button label="Choose Area" variant="secondary" onPress={() => navigation.navigate('SelectLocation')} />
          </View>
        </View>
      ) : !coords && locating ? (
        <LoadingView />
      ) : !coords ? (
        /*
         * Permission is granted but no fix arrived - timed out, services off,
         * or simply never resolved. This branch used to render <LoadingView />,
         * which spun forever and left the screen with no way forward. Say what
         * happened and offer both ways out.
         */
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md }}>
          <Ionicons name="locate-outline" size={40} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, textAlign: 'center' }}>
            Couldn't find your location
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
            {locationError ?? 'We could not get a location fix on this device.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="Try Again" onPress={() => void refreshLocation()} loading={locating} />
            <Button label="Choose Area" variant="secondary" onPress={() => navigation.navigate('SelectLocation')} />
          </View>
        </View>
      ) : (
        <>
          {/*
            §11's Near Me Featured, above the map rather than inside it. A
            promoted listing rendered as a map pin would be indistinguishable
            from an organic one at a glance, which is exactly what §11 forbids -
            a pin has nowhere to carry a "Promoted" label a customer will read.
          */}
          {featured.length > 0 ? (
            <View style={{ marginBottom: spacing.xs }}>
              <FeaturedRail placements={featured} onPress={openFeatured} />
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, marginBottom: spacing.xs }}>
            {TYPE_CHIPS.map((chip) => (
              <Chip key={chip.value} label={chip.label} selected={typeFilter === chip.value} onPress={() => setTypeFilter(chip.value)} />
            ))}
          </View>

          <View style={{ flex: 1 }}>
            {nearby.isLoading ? (
              <LoadingView />
            ) : nearby.isError ? (
              /* §52: the location was found, the lookup failed. Distinct from
                 "nothing nearby", which would send the customer looking for a
                 different area rather than tapping Retry. */
              <ErrorState
                offline={isNetworkError(nearby.error)}
                message={getApiErrorMessage(nearby.error, 'We’re having trouble loading what’s nearby. Please try again.')}
                onRetry={() => nearby.refetch()}
                secondaryLabel="Choose area"
                onSecondary={() => navigation.navigate('SelectLocation')}
              />
            ) : pins.length === 0 ? (
              <EmptyState icon="map-outline" title="Nothing nearby" message="No offers or services found close to you." />
            ) : !mapsAvailable ? (
              <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}>
                {/* The map being unavailable is our configuration problem, not
                    something the customer did or can act on. Naming the missing
                    API key told them the app was half-built and gave them
                    nothing to do about it; the list below is the whole feature
                    either way, so this just says what they are looking at. */}
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginBottom: spacing.xxs }}>
                  {pins.length} {pins.length === 1 ? 'place' : 'places'} near you, closest first
                </Text>
                {pins.map((listing) => (
                  <Pressable
                    key={`${listing.sourceType}-${listing.id}`}
                    onPress={() => openDetails(listing)}
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
                    <Ionicons
                      name={listing.sourceType === 'product' ? 'pricetag-outline' : 'construct-outline'}
                      size={18}
                      color={listing.sourceType === 'product' ? colors.brand : colors.accent}
                    />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.semibold }}>
                        {listing.title}
                      </Text>
                      <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                        {listing.shop.name}
                        {formatDistance(listing.distanceKm) ? ` · ${formatDistance(listing.distanceKm)}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1,
                }}
              >
                {pins.map((listing) => (
                  <Marker
                    key={`${listing.sourceType}-${listing.id}`}
                    coordinate={{ latitude: listing.latitude as number, longitude: listing.longitude as number }}
                    pinColor={listing.sourceType === 'product' ? colors.brand : colors.accent}
                    onPress={() => setSelected(listing)}
                  />
                ))}
              </MapView>
            )}

            {selected ? (
              <View
                style={{
                  position: 'absolute',
                  left: spacing.md,
                  right: spacing.md,
                  bottom: spacing.md,
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.sm,
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: fontWeights.semibold }}>
                      {selected.shop.name.toUpperCase()} · {selected.sourceType === 'product' ? 'Offer' : 'Service'}
                    </Text>
                    <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
                      {selected.title}
                    </Text>
                    <Text style={{ color: colors.accent, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>
                      {headlineFor(selected)}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelected(null)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
                <Button label="View Details" onPress={() => openDetails(selected)} fullWidth style={{ marginTop: spacing.xs }} />
              </View>
            ) : null}
          </View>
        </>
      )}
    </Screen>
  );
}
