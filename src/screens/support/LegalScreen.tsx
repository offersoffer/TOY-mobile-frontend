import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/ui';
import { ScreenHeader } from './ScreenHeader';
import { useSupportContact } from './useSupportContact';
import {
  LEGAL_ENTITY,
  POLICY_LAST_UPDATED,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  type LegalSection,
} from '../../content/support';
import type { SupportScreenProps } from '../../navigation/types';

/**
 * Privacy Policy and Terms & Conditions.
 *
 * One screen for both, because they are the same shape - a dated preamble, a
 * numbered run of sections, and a way to reach a human at the end - and a
 * second copy of this layout would drift from the first within a release.
 * Which document it shows comes from the route param.
 *
 * There is no jump-to-section index the way the website has one. On a phone
 * the contents list is most of a screen and the thumb scroll is faster than
 * reading it; the numbers stay because they are what a support reply cites.
 */

const DOCUMENTS = {
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This policy explains what information OffersOffer collects, why we collect it, and what you can do about it.',
    sections: PRIVACY_SECTIONS,
  },
  terms: {
    title: 'Terms & Conditions',
    intro:
      'These terms cover your use of OffersOffer — what you can expect from us, and what we ask of you.',
    sections: TERMS_SECTIONS,
  },
} as const;

export type LegalDocument = keyof typeof DOCUMENTS;

export function LegalScreen({ navigation, route }: SupportScreenProps<'Legal'>) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const contact = useSupportContact();
  const document = DOCUMENTS[route.params?.document ?? 'privacy'];

  return (
    <Screen>
      <ScreenHeader title={document.title} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            Last updated: <Text style={{ fontWeight: fontWeights.semibold }}>{POLICY_LAST_UPDATED}</Text>
          </Text>
          <Text style={{ color: colors.text, fontSize: fontSizes.md, lineHeight: fontSizes.md * 1.5 }}>
            {document.intro}
          </Text>

          {/* Said once, plainly, at the top. A document that quietly implies it
              was drafted by a lawyer when it was not is the more misleading of
              the two options. */}
          <Text
            style={{
              color: colors.textSubtle,
              fontSize: fontSizes.sm,
              lineHeight: fontSizes.sm * 1.45,
              borderLeftWidth: 2,
              borderLeftColor: colors.border,
              paddingLeft: spacing.sm,
              marginTop: spacing.xxs,
            }}
          >
            This document describes how {LEGAL_ENTITY} works today. It is written to be understood
            rather than to be exhaustive, and it is not legal advice. Where it is unclear, ask us —
            the contact details are at the end.
          </Text>
        </View>

        {document.sections.map((section, index) => (
          <Section key={section.heading} number={index + 1} section={section} />
        ))}

        <View
          style={{
            gap: spacing.xxs,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
            Contact us
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.xxs }}>
            Questions about this document, or about the information we hold on you:
          </Text>

          <Pressable onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
            <Text style={{ color: colors.brand, fontSize: fontSizes.md }}>{contact.email}</Text>
          </Pressable>
          {contact.phones.map((phone) => (
            <Pressable key={phone} onPress={() => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`)}>
              <Text style={{ color: colors.brand, fontSize: fontSizes.md }}>{phone}</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => navigation.navigate('HelpSupport', undefined)}
            style={{ marginTop: spacing.xs }}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
              You can also{' '}
              <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold }}>
                raise a support request
              </Text>
              , which gives you a reference to quote and keeps the reply in one place.
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({ number, section }: { number: number; section: LegalSection }) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
        <Text style={{ color: colors.textSubtle }}>{number}. </Text>
        {section.heading}
      </Text>

      {section.body?.map((paragraph) => (
        <Text
          key={paragraph.slice(0, 40)}
          style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.6 }}
        >
          {paragraph}
        </Text>
      ))}

      {section.list?.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: spacing.xs, paddingLeft: spacing.xs }}>
          <Text style={{ color: colors.textSubtle, fontSize: fontSizes.sm }}>•</Text>
          <Text
            style={{ flex: 1, color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 }}
          >
            {item}
          </Text>
        </View>
      ))}

      {section.callout ? (
        <Text
          style={{
            color: colors.text,
            fontSize: fontSizes.sm,
            lineHeight: fontSizes.sm * 1.5,
            backgroundColor: colors.surface,
            borderLeftWidth: 3,
            borderLeftColor: colors.brand,
            borderRadius: radii.sm,
            padding: spacing.sm,
          }}
        >
          {section.callout}
        </Text>
      ) : null}
    </View>
  );
}
