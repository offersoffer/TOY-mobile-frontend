import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Screen } from '../../components/ui';
import { ScreenHeader } from './ScreenHeader';
import { ABOUT_FEATURES } from '../../content/support';
import type { GoBackScreenProps } from '../../navigation/types';

/**
 * About OffersOffer.
 *
 * Written for a customer rather than a regulator: what the app is for, and
 * what you can do with it. The legal register belongs on Privacy and Terms,
 * and mixing the two makes both worse.
 *
 * Reachable by a guest, like everything under Help & legal.
 */
export function AboutScreen({ navigation }: GoBackScreenProps) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();

  return (
    <Screen>
      <ScreenHeader title="About OffersOffer" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.brand, fontSize: fontSizes.lg, fontWeight: fontWeights.bold }}>
            Discover better offers. Find useful services. Shop smarter.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.md, lineHeight: fontSizes.md * 1.5 }}>
            OffersOffer is a local discovery platform that helps customers find offers, discounts,
            promotions and services from shops around them.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.md, lineHeight: fontSizes.md * 1.5 }}>
            Instead of checking a dozen Instagram pages, WhatsApp forwards, posters and individual
            shop websites, you can find what is actually on offer near you in one place.
          </Text>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold }}>
            What you can do
          </Text>

          {ABOUT_FEATURES.map((feature) => (
            <View
              key={feature.title}
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                padding: spacing.sm,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Ionicons name={feature.icon} size={20} color={colors.brand} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.semibold }}>
                  {feature.title}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.45 }}>
                  {feature.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View
          style={{
            gap: spacing.xs,
            padding: spacing.md,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
            Built for local businesses
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 }}>
            OffersOffer helps shops show their offers and services to nearby customers, and gives
            merchants something they rarely get from a poster or a story post: how many people saw a
            listing, how many claimed it, and how many of those claims were actually redeemed at the
            counter.
          </Text>
        </View>

        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.md,
            fontStyle: 'italic',
            lineHeight: fontSizes.md * 1.5,
            borderLeftWidth: 3,
            borderLeftColor: colors.brand,
            paddingLeft: spacing.sm,
          }}
        >
          We’re starting locally, with a focus on helping businesses and customers connect more
          easily through relevant offers and services.
        </Text>
      </ScrollView>
    </Screen>
  );
}
