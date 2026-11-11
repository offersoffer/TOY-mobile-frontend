import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Button } from './ui';
import type { PlanUpgradeRequiredDetails } from '../types/admin';

interface UpgradePromptProps {
  details: PlanUpgradeRequiredDetails;
  onViewPlan: () => void;
  featureLabel?: string;
}

/**
 * What to say when a feature belongs to a plan this shop is not on.
 *
 * It names the plan and stops there. It used to end in "View Plan & Upgrade",
 * which on Android is a problem twice over: there is no longer a checkout for
 * it to lead to, and Google Play's Payments policy forbids leading users to a
 * payment method other than Play billing - which a button promising an
 * upgrade does, whatever screen it opens. So the button now offers to show
 * what the plans include, which is the whole of what the app can do.
 */
export function UpgradePrompt({ details, onViewPlan, featureLabel }: UpgradePromptProps) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();

  return (
    <View
      style={{
        margin: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: colors.brandTint,
        borderWidth: 1,
        borderColor: colors.brandLight,
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      <Ionicons name="sparkles" size={28} color={colors.brandStrong} />
      <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold }}>Premium Feature</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.md, textAlign: 'center' }}>
        {featureLabel ?? 'This feature is'} available on the {details.requiredPlanName} plan
        {details.requiredPlanPrice ? ` (₹${details.requiredPlanPrice}/month)` : ''}.
      </Text>
      <Button label="See what each plan includes" onPress={onViewPlan} style={{ marginTop: spacing.xs }} />
    </View>
  );
}
