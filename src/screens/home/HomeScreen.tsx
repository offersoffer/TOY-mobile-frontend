import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { Screen } from '../../components/ui';
import { SearchBar, LocationSelector, BannerCarousel, OfferRail, SectionHeader, CategoryCard, UnifiedListingCard, FeaturedRail, BrandMark } from '../../components';
import { useAuth } from '../../store/AuthContext';
import { useAuthPrompt } from '../../store/AuthPromptContext';
import { useLocationContext } from '../../services/location/LocationContext';
import {
  useFeaturedBanners,
  useEndingSoonOffers,
  useNearbyOffers,
  useRecommendedOffers,
  usePopularOffers,
  useCategories,
  useToggleFavorite,
  useUnifiedOffers,
  useRankedFeed,
} from '../../hooks';
import { useOffersList } from '../../hooks/useOffers';
import { trackBanner, trackEvent } from '../../services/analytics/analyticsService';
import { trackListingOpen } from '../../services/analytics/visibilityService';
import { toUnifiedListing } from '../../utils/rankedListing';
import { getTimeOfDayGreeting } from '../../utils/greeting';
import type { MainTabScreenProps } from '../../navigation/types';
import type { Offer, Banner, Category, UnifiedListing, FeaturedPlacement, RankedListing } from '../../types';

type Props = MainTabScreenProps<'Offers'>;


export function HomeScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const prompt = useAuthPrompt();
  const { permissionStatus, requestPermission, coords } = useLocationContext();
  const queryClient = useQueryClient();

  const banners = useFeaturedBanners();
  const endingSoon = useEndingSoonOffers();
  const nearby = useNearbyOffers();
  const recommended = useRecommendedOffers();
  // "From your favorite shops" needs followed shops, which needs an account
  // (§25) - so the request is not made for a guest and the rail is hidden.
  const favoriteShopOffers = useOffersList(
    { following: true, sort: 'newest', limit: 10 },
    isAuthenticated,
  );
  const popular = usePopularOffers();
  const categories = useCategories();
  const toggleFavorite = useToggleFavorite();
  const unifiedOffers = useUnifiedOffers({}, 10);
  /**
   * The ranked home feed (§4) and its Home Featured rail (§11).
   *
   * Added beside the existing rails rather than replacing them: those are
   * single-signal lists a customer recognises ("Ending Soon", "Popular"), while
   * this is the weighted blend of all nine factors. Both have a place on a home
   * screen, and swapping one for the other in a single release would change
   * every rail at once with no way to tell which change did what.
   */
  const rankedFeed = useRankedFeed(10, 5);

  // §32's impressions are recorded server-side, by the endpoint that served
  // this page - see `visibilityAnalytics.recordImpressions`. Reporting them
  // from here as well counted every card twice, and three times once the feed
  // re-fetched with the customer's location. The client reports only what the
  // server cannot see: which card was tapped.

  const refreshing =
    banners.isRefetching ||
    endingSoon.isRefetching ||
    nearby.isRefetching ||
    recommended.isRefetching ||
    popular.isRefetching ||
    rankedFeed.isRefetching;

  const onRefresh = useCallback(() => {
    banners.refetch();
    endingSoon.refetch();
    nearby.refetch();
    recommended.refetch();
    favoriteShopOffers.refetch();
    popular.refetch();
    categories.refetch();
    rankedFeed.refetch();
  }, [banners, endingSoon, nearby, recommended, favoriteShopOffers, popular, categories, rankedFeed]);

  const openOffer = (offer: Offer) => navigation.navigate('OfferDetail', { offerId: offer.id });
  const openRecommendedOffer = (offer: Offer) => {
    trackEvent({ event: 'RECOMMENDATION_CLICK', offerId: offer.id });
    openOffer(offer);
  };
  const openBanner = (banner: Banner) => {
    trackBanner(banner.id, 'click');
    navigation.navigate('OfferDetail', { offerId: banner.offerId });
  };
  const openCategory = (category: Category) => {
    trackEvent({ event: 'CATEGORY_VIEW', categoryId: category.id });
    navigation.navigate('CategoryOffers', { categoryId: category.id, categoryName: category.name });
  };
  /**
   * §5/§7: the heart never redirects a guest. It raises the sheet over the rail
   * they are already scrolling, and the save runs itself once they are in.
   */
  const onToggleSave = (offer: Offer) => {
    if (!prompt.require('save-offer', () => onToggleSave(offer))) return;
    toggleFavorite.mutate({ offerId: offer.id, isFavorite: offer.isFavorite }, {
      onSettled: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
    });
  };
  /**
   * A promoted card. The click is recorded before navigating, because §17's
   * campaign click-through rate is measured from it and the screen is about to
   * unmount - queueing it after the navigate would lose it on a fast device.
   */
  const openFeatured = (placement: FeaturedPlacement, position: number) => {
    trackListingOpen(placement, { surface: 'HOME' }, position);
    if (placement.listingType === 'shop') {
      navigation.navigate('ShopDetail', { shopId: placement.id });
      return;
    }
    if (placement.listingType === 'offer') {
      navigation.navigate('OfferDetail', { offerId: placement.id });
    }
  };

  const openRanked = (listing: RankedListing) => {
    if (listing.listingType === 'service_offer' && listing.serviceId != null) {
      navigation.navigate('ServiceDetail', { serviceId: listing.serviceId });
      return;
    }
    navigation.navigate('OfferDetail', { offerId: listing.id });
  };

  const openUnifiedListing = (listing: UnifiedListing) => {
    if (listing.sourceType === 'product') {
      navigation.navigate('OfferDetail', { offerId: listing.id });
    } else if (listing.serviceId != null) {
      navigation.navigate('ServiceDetail', { serviceId: listing.serviceId });
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/*
              The mark leads the header, before the greeting, and carries an
              accessibility label - it is the only thing on this screen that
              says which app this is, so a screen reader arriving at the top
              should hear it rather than skip it. Centred against the two-line
              block, because pinned to the top it read as misaligned with the
              headline beside it.
            */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
              <BrandMark />
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                  {getTimeOfDayGreeting()} {user?.name?.split(' ')[0] ?? 'there'} 👋
                </Text>
                <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>
                  {user?.preferencesCompleted ? 'Offers picked for you' : 'Discover great offers'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                if (prompt.require('notifications', () => navigation.navigate('Notifications'))) {
                  navigation.navigate('Notifications');
                }
              }}
              hitSlop={8}
              style={{ padding: spacing.xxs }}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </Pressable>
          </View>

          <SearchBar value="" onChangeText={() => {}} editable={false} onPress={() => navigation.navigate('Search', {})} />

          {/*
            Always open the picker. Gating this on permission meant that once
            location was denied the chip only re-requested it - which the OS
            answers instantly and silently after the first refusal - so the
            manual city search, the entire point of the fallback, was
            unreachable. The picker itself offers both ways in.
          */}
          <LocationSelector onPress={() => navigation.navigate('SelectLocation')} />
          {permissionStatus === 'denied' ? (
            <View
              style={{
                backgroundColor: colors.warningBg,
                borderRadius: 12,
                padding: spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <Ionicons name="location-outline" size={18} color={colors.warning} />
              <Text style={{ flex: 1, color: colors.warning, fontSize: fontSizes.sm }}>
                Turn on location to discover offers near you.
              </Text>
              <Pressable onPress={requestPermission}>
                <Text style={{ color: colors.warning, fontWeight: fontWeights.bold, fontSize: fontSizes.sm }}>Enable</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={{ height: spacing.md }} />

        {banners.data && banners.data.length > 0 ? (
          <View style={{ marginBottom: spacing.lg }}>
            <BannerCarousel banners={banners.data} onPress={openBanner} onImpression={(b) => trackBanner(b.id, 'impression')} />
          </View>
        ) : null}

        {/*
          §29's shape: the promotional block, then the organic one. Two separate
          rails rather than one merged list, so a promoted card can never be
          mistaken for an organic result (§11) and no client-side merge can
          quietly undo that.
        */}
        <FeaturedRail
          subtitle="Promotions from shops near you"
          placements={rankedFeed.data?.featured ?? []}
          onPress={openFeatured}
        />

        {(rankedFeed.data?.items.length ?? 0) > 0 ? (
          <View style={{ marginBottom: spacing.lg }}>
            <SectionHeader title="Picked for you" subtitle="Ranked by relevance, distance and freshness" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
            >
              {(rankedFeed.data?.items ?? []).map((listing) => (
                <UnifiedListingCard
                  key={`ranked-${listing.listingType}-${listing.id}`}
                  listing={toUnifiedListing(listing)}
                  width={200}
                  onPress={() => openRanked(listing)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {(unifiedOffers.data?.length ?? 0) > 0 ? (
          <View style={{ marginBottom: spacing.lg }}>
            <SectionHeader title="Offers & Services" subtitle="Deals from products and services alike" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
              {(unifiedOffers.data ?? []).map((listing) => (
                <UnifiedListingCard key={`${listing.sourceType}-${listing.id}`} listing={listing} width={200} onPress={openUnifiedListing} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <OfferRail
          title="Ending Soon"
          subtitle="Grab these before they're gone"
          offers={endingSoon.data ?? []}
          loading={endingSoon.isLoading}
          onOfferPress={openOffer}
          onToggleSave={onToggleSave}
          onSeeAll={() => navigation.navigate('Search', { query: undefined })}
        />

        {/*
          Gated on having coordinates, not on the permission. `useNearbyOffers`
          keys off `coords`, which a manually chosen city supplies just as well
          - so gating on permission hid this rail from anyone who declined
          location and picked their area by hand, which is exactly the case the
          manual picker exists to serve.
        */}
        {coords ? (
          <OfferRail
            title="Near You"
            subtitle="Offers close to your location"
            offers={nearby.data ?? []}
            loading={nearby.isLoading}
            onOfferPress={openOffer}
            onToggleSave={onToggleSave}
            emptyMessage="No nearby offers right now."
          />
        ) : null}

        {/*
          §11/§12: the ranking behind this rail is the same call either way, but
          what feeds it is not. A signed-in customer's comes from their saves,
          follows and history; a guest's comes from location, trending and
          freshness. Calling a guest's "Recommended For You" would claim a
          personalisation there is no account to base it on.
        */}
        <OfferRail
          title={isAuthenticated ? 'Recommended For You' : 'Popular Near You'}
          subtitle={isAuthenticated ? recommended.data?.[0]?.reason : 'Trending with shoppers nearby'}
          offers={recommended.data ?? []}
          loading={recommended.isLoading}
          onOfferPress={openRecommendedOffer}
          onToggleSave={onToggleSave}
        />

        {isAuthenticated ? (
          <OfferRail
            title="From Your Favorite Shops"
            subtitle="New offers from shops and categories you follow"
            offers={favoriteShopOffers.data?.pages[0]?.offers ?? []}
            loading={favoriteShopOffers.isLoading}
            onOfferPress={openOffer}
            onToggleSave={onToggleSave}
          />
        ) : null}

        <OfferRail
          title="Popular Offers"
          offers={popular.data ?? []}
          loading={popular.isLoading}
          onOfferPress={openOffer}
          onToggleSave={onToggleSave}
        />

        {!isAuthenticated ? (
          <View
            style={{
              marginHorizontal: spacing.md,
              marginBottom: spacing.lg,
              padding: spacing.md,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              gap: spacing.xxs,
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold }}>
              ✨ Make OffersOffer personal
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
              Get recommendations based on what you like, and hear before an offer expires.
            </Text>
            <Pressable onPress={() => prompt.open('generic')} style={{ marginTop: spacing.xs }}>
              <Text style={{ color: colors.brand, fontWeight: fontWeights.bold, fontSize: fontSizes.md }}>
                Create Free Account
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ marginBottom: spacing.lg }}>
          <SectionHeader title="Categories" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.md }}>
            {(categories.data ?? []).map((category) => (
              <CategoryCard key={category.id} category={category} onPress={() => openCategory(category)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}
