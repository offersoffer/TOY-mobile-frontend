import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme';
import { Button } from '../../components/ui';
import type { Registration } from '../../types';

interface Props {
  registration: Registration;
  onClose: () => void;
}

/** What each state looks like and says (§12). */
const PRESENTATION: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; title: (name: string) => string; tone: 'info' | 'warning' | 'danger' | 'success' }
> = {
  PENDING_VERIFICATION: {
    icon: 'time-outline',
    title: () => 'Your shop registration has been submitted',
    tone: 'info',
  },
  ADDITIONAL_INFO_REQUIRED: {
    icon: 'alert-circle-outline',
    title: () => 'We need a little more information',
    tone: 'warning',
  },
  REJECTED: {
    icon: 'close-circle-outline',
    title: () => 'Your registration was not approved',
    tone: 'danger',
  },
  SUSPENDED: {
    icon: 'ban-outline',
    title: () => 'This shop is suspended',
    tone: 'danger',
  },
  VERIFIED: {
    icon: 'checkmark-circle-outline',
    title: (name: string) => `${name} is verified`,
    tone: 'success',
  },
};

/**
 * Where a submitted registration stands (Self-Service Onboarding §12).
 *
 * Deliberately not a progress bar. §12 asks for a status the seller can act
 * on, so a decision that needs something from them leads with the reviewer's
 * own words - `decisionReason` is written to be read by the seller - and the
 * pending state spells out what works and what does not yet, because
 * "pending" on its own invites a support ticket asking why the shop cannot be
 * found in search.
 */
export function RegistrationStatus({ registration, onClose }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();

  const presentation = PRESENTATION[registration.verificationStatus] ?? PRESENTATION.VERIFIED;
  const accent =
    presentation.tone === 'success'
      ? colors.success
      : presentation.tone === 'danger'
        ? colors.danger
        : presentation.tone === 'warning'
          ? colors.warning
          : colors.info;

  const pending = registration.verificationStatus === 'PENDING_VERIFICATION';

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View
        style={{
          alignItems: 'center',
          gap: spacing.xs,
          padding: spacing.lg,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons name={presentation.icon} size={44} color={accent} />
        <Text
          style={{
            color: colors.text,
            fontSize: fontSizes.xxl,
            fontWeight: fontWeights.bold,
            textAlign: 'center',
          }}
        >
          {presentation.title(registration.name)}
        </Text>

        {pending ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
            Status: <Text style={{ fontWeight: fontWeights.semibold }}>Pending verification</Text>. We
            will let you know when the review is complete.
          </Text>
        ) : registration.decisionReason ? (
          // The reviewer's own words, verbatim (§12, §14). Paraphrasing them
          // is how a seller ends up unable to tell what to fix.
          <Text style={{ color: colors.text, fontSize: fontSizes.md, textAlign: 'center', lineHeight: 21 }}>
            {registration.decisionReason}
          </Text>
        ) : registration.verificationStatus === 'VERIFIED' ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
            You can now manage your shop, offers and services.
          </Text>
        ) : null}
      </View>

      {pending ? (
        <View style={{ gap: spacing.sm }}>
          <StatusList
            title="You can"
            icon="checkmark"
            tint={colors.success}
            items={[
              'View and update permitted shop details',
              'Prepare offer and service drafts',
              'Review your registration information',
            ]}
          />
          <StatusList
            title="You cannot yet"
            icon="close"
            tint={colors.textMuted}
            items={[
              'Publish public offers or services',
              'Receive customer claims or bookings',
              'Appear in public search or Near Me results',
            ]}
          />
        </View>
      ) : null}

      {registration.verificationStatus === 'VERIFIED' ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
          Reopen the app to switch to your shop dashboard.
        </Text>
      ) : null}

      <Button label="Done" variant="secondary" onPress={onClose} fullWidth />
    </ScrollView>
  );
}

function StatusList({
  title,
  items,
  icon,
  tint,
}: {
  title: string;
  items: string[];
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
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
      <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>
        {title}
      </Text>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
          <Ionicons name={icon} size={15} color={tint} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, color: colors.textMuted, fontSize: fontSizes.sm }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
