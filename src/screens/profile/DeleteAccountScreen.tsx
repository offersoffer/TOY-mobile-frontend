import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Screen, Button, TextField } from '../../components/ui';
import { useAuth } from '../../store/AuthContext';
import { getApiErrorMessage } from '../../api/client';
import type { GoBackScreenProps } from '../../navigation/types';

type Props = GoBackScreenProps;

/** Typed into the confirmation field, so the last step cannot be a stray tap. */
const CONFIRM_WORD = 'DELETE';

/**
 * What the account takes with it, and what it does not.
 *
 * Shown rather than merely implied because Google Play's data-deletion policy
 * asks the app to tell the user which data is removed and which is retained,
 * and because the retained half is genuinely surprising: a redemption the shop
 * already honoured survives, stripped of the customer, since it is the shop's
 * record of a transaction and not the customer's personal data.
 */
const DELETED = [
  'Your profile, email address and phone number',
  'Saved offers, favourites and followed shops',
  'Your claims, bookings and QR codes',
  'Reviews and ratings you have written',
  'Notifications, notification settings and registered devices',
  'Your search history and saved locations',
];

const RETAINED = [
  'Redemptions a shop has already honoured, with your name removed',
  'Security and audit records we are required to keep',
];

export function DeleteAccountScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * No success state and no goBack(): deleting clears the session, which swings
   * the root navigator over to the auth stack and unmounts this screen. Trying
   * to navigate afterwards would race that swap.
   */
  const runDeletion = async () => {
    setSubmitError(null);
    setLoading(true);
    try {
      await deleteAccount(password);
    } catch (err) {
      // The server's refusals are written for the user - a wrong password, a
      // shop they still manage, a staff account - so they are shown verbatim.
      setSubmitError(getApiErrorMessage(err));
      setLoading(false);
    }
  };

  const onSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!password) nextErrors.password = 'Enter your password to confirm.';
    if (confirmation.trim().toUpperCase() !== CONFIRM_WORD) {
      nextErrors.confirmation = `Type ${CONFIRM_WORD} exactly to confirm.`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    Alert.alert(
      'Delete your account?',
      'This cannot be undone. Your account and personal data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: runDeletion },
      ],
    );
  };

  const bullet = (text: string, tone: string) => (
    <View key={text} style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
      <Text style={{ color: tone, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 }}>•</Text>
      <Text style={{ flex: 1, color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 }}>
        {text}
      </Text>
    </View>
  );

  return (
    <Screen>
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
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>
          Delete Account
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View
          style={{
            backgroundColor: colors.dangerBg,
            borderRadius: radii.md,
            borderLeftWidth: 3,
            borderLeftColor: colors.danger,
            padding: spacing.md,
            gap: spacing.xs,
          }}
        >
          <Text style={{ color: colors.danger, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
            This cannot be undone
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 }}>
            Deleting your account removes it permanently. You will not be able to sign in again, and
            we cannot restore it later.
          </Text>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
            What gets deleted
          </Text>
          {DELETED.map((item) => bullet(item, colors.danger))}
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
            What we keep
          </Text>
          {RETAINED.map((item) => bullet(item, colors.textMuted))}
        </View>

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureToggle
          secureTextEntry
          leftIcon="lock-closed-outline"
          error={errors.password}
        />
        <TextField
          label={`Type ${CONFIRM_WORD} to confirm`}
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          leftIcon="alert-circle-outline"
          error={errors.confirmation}
        />

        {submitError ? (
          <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>{submitError}</Text>
        ) : null}

        <Button
          label="Delete My Account"
          variant="danger"
          onPress={onSubmit}
          loading={loading}
          fullWidth
        />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
      </ScrollView>
    </Screen>
  );
}
