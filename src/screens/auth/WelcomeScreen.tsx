import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen, Button } from '../../components/ui';
import { useAuth } from '../../store/AuthContext';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

/**
 * First launch (Guest Browsing §20).
 *
 *   Login / Sign Up   OR   Continue as Guest
 *
 * This is the only screen standing between a new install and the marketplace,
 * and it is a choice rather than a wall - the guest branch leads straight into
 * the full browsing experience. §18's framing applies: the benefits listed are
 * what an account *adds*, not what it unlocks.
 */
export function WelcomeScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights } = useTheme();
  const { continueAsGuest } = useAuth();
  const [entering, setEntering] = useState(false);

  const onGuest = () => {
    setEntering(true);
    void continueAsGuest();
  };

  return (
    <Screen>
      <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg }}>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ fontSize: fontSizes.display, fontWeight: fontWeights.bold, color: colors.text }}>
            OffersOffer
          </Text>
          <Text
            style={{
              fontSize: fontSizes.md,
              color: colors.textMuted,
              textAlign: 'center',
              lineHeight: fontSizes.md * 1.45,
            }}
          >
            Discover offers and services from shops near you. Browse freely — make it personal when
            you&rsquo;re ready.
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, flex: 1 }}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.xs }}>
          <Button label="Log In" onPress={() => navigation.navigate('Login')} fullWidth />
          <Button
            label="Create Free Account"
            variant="secondary"
            onPress={() => navigation.navigate('Register')}
            fullWidth
          />
          <Button label="Continue as Guest" variant="ghost" onPress={onGuest} loading={entering} fullWidth />
        </View>
      </View>
    </Screen>
  );
}

/** §18: what an account adds, phrased as gains rather than restrictions. */
const BENEFITS = [
  'Save offers and services',
  'Follow the shops you like',
  'Get alerts before an offer expires',
  'Claim offers and track your savings',
];
