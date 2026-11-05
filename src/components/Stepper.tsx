import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme';

export interface WizardStep {
  /** Stable key, used for tracking and to decide what the step collects. */
  key: string;
  label: string;
  /** Shown as "optional" so nobody fills it in out of obligation (§4). */
  optional?: boolean;
}

interface Props {
  steps: WizardStep[];
  current: number;
  /** The furthest step reached, owned by the wizard (see below). */
  furthest: number;
  onStepPress: (index: number) => void;
}

/**
 * Progress through a multi-step form (Self-Service Onboarding §4, §23).
 *
 * The mobile counterpart of `TOY-frontend/src/app/shared/stepper.component.ts`
 * and the same two jobs: it says where you are, and it lets you go back
 * without losing what you typed. §4 asks for progress to be visible and each
 * step validated before continuing, which only works if returning to a
 * finished step is free - otherwise "validate before continuing" reads as
 * "you cannot fix the thing you just got wrong".
 *
 * Forward movement is deliberately not offered. A step is reachable once it
 * has been reached, and `furthest` belongs to the wizard, because only the
 * wizard knows whether the current step validates.
 *
 * Where the web version shows labels and collapses them under 720px, this
 * shows the counter and the current step's name above a row of markers. A
 * phone has no width to spend on six labels, and six labels wrapped over
 * three lines is not progress, it is a header.
 */
export function Stepper({ steps, current, furthest, onStepPress }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const step = steps[current];

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={`Registration progress. Step ${current + 1} of ${steps.length}: ${step?.label ?? ''}`}
      style={{ gap: spacing.xs }}
    >
      <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>
        Step {current + 1} of {steps.length}
        <Text style={{ color: colors.textMuted, fontWeight: fontWeights.regular }}>
          {' · '}
          {step?.label}
          {step?.optional ? ' (optional)' : ''}
        </Text>
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs / 2 }}>
        {steps.map((item, index) => {
          const done = index < current;
          const active = index === current;
          // Only backwards. Going forward is the wizard's decision, and a
          // stepper that lets someone skip the step that validates is how an
          // incomplete registration reaches the review screen.
          const reachable = index <= furthest && !active;

          /*
            Status is carried three ways on purpose (§23 forbids colour
            alone): the tick or the number is a shape, the state is spelled
            out for a screen reader, and the colour is the thing you notice
            last.
          */
          const marker = (
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: radii.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? colors.brand : active ? colors.brandLight : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.brand : done ? colors.brand : colors.border,
              }}
            >
              {done ? (
                <Ionicons name="checkmark" size={14} color={colors.textOnBrand} />
              ) : (
                <Text
                  style={{
                    color: active ? colors.brandStrong : colors.textMuted,
                    fontSize: fontSizes.sm,
                    fontWeight: active ? fontWeights.bold : fontWeights.medium,
                  }}
                >
                  {index + 1}
                </Text>
              )}
            </View>
          );

          const state = done ? 'completed' : active ? 'current step' : 'not started';
          const label = `${item.label}${item.optional ? ', optional' : ''} — ${state}`;

          return (
            <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {reachable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label}. Go back to this step.`}
                  onPress={() => onStepPress(index)}
                  hitSlop={6}
                >
                  {marker}
                </Pressable>
              ) : (
                <View accessibilityLabel={label} accessibilityState={{ selected: active }}>
                  {marker}
                </View>
              )}

              {index < steps.length - 1 ? (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    marginHorizontal: 2,
                    borderRadius: 1,
                    backgroundColor: index < current ? colors.brand : colors.border,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
