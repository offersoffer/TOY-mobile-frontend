import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Screen, Button } from '../../components/ui';
import { ScreenHeader } from './ScreenHeader';
import { useSupportContact } from './useSupportContact';
import type { SupportScreenProps } from '../../navigation/types';

/**
 * Contact us.
 *
 * Separate from Help & Support because they answer different questions.
 * Support is "something is wrong, here is what happened" and produces a
 * ticket; Contact is "how do I reach you" and produces an address. Merging
 * them means somebody wanting a phone number scrolls past a nine-field form.
 *
 * So this screen is short, and its main job is to point at the form for
 * anything that would be better as a ticket.
 */
export function ContactScreen({ navigation }: SupportScreenProps<'Contact'>) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const contact = useSupportContact();

  const card = {
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  } as const;

  return (
    <Screen>
      <ScreenHeader title="Contact us" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.md, lineHeight: fontSizes.md * 1.5 }}>
          For anything about your account, an offer or a shop, the support form is quicker — it gives
          you a reference and keeps the whole thread in one place.
        </Text>
        <Button
          label="Raise a support request"
          onPress={() => navigation.navigate('HelpSupport', undefined)}
          fullWidth
        />

        <View style={card}>
          <Ionicons name="mail-outline" size={20} color={colors.brand} />
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>Email</Text>
          <Pressable onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
            <Text style={{ color: colors.brand, fontSize: fontSizes.md }}>{contact.email}</Text>
          </Pressable>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.45 }}>
            We read everything that arrives here. Include your ticket reference if you already have
            one.
          </Text>
        </View>

        <View style={card}>
          <Ionicons name="call-outline" size={20} color={colors.brand} />
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>Phone</Text>
          {contact.phones.map((phone) => (
            <Pressable key={phone} onPress={() => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`)}>
              <Text style={{ color: colors.brand, fontSize: fontSizes.md }}>{phone}</Text>
            </Pressable>
          ))}
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.45 }}>
            Best for something urgent at a shop counter — a code that will not verify, say.
          </Text>
        </View>

        <View style={card}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
            Privacy and data
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.45 }}>
            Questions about the information we hold, or a request to access, correct or delete it, go
            to the same address — say what you are asking for and we will handle it.
          </Text>
          <Pressable onPress={() => navigation.navigate('Legal', { document: 'privacy' })}>
            <Text style={{ color: colors.brand, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>
              Read the Privacy Policy
            </Text>
          </Pressable>
        </View>

        <View style={card}>
          <Ionicons name="storefront-outline" size={20} color={colors.brand} />
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
            For businesses
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.45 }}>
            Want your shop’s offers on OffersOffer? Get in touch, or create an account and add your
            shop — we review each one before it goes live.
          </Text>
          <Pressable onPress={() => navigation.navigate('About')}>
            <Text style={{ color: colors.brand, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>
              About OffersOffer
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
