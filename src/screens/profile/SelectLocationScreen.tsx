import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Screen, Button, TextField } from '../../components/ui';
import { geoApi } from '../../api';
import { getApiErrorMessage } from '../../api/client';
import { useLocationContext } from '../../services/location/LocationContext';
import type { RootStackScreenProps } from '../../navigation/types';

type Props = RootStackScreenProps<'SelectLocation'>;

export function SelectLocationScreen({ navigation }: Props) {
  const { colors, spacing, fontSizes, fontWeights } = useTheme();
  const { permissionStatus, requestPermission, refreshLocation, setManualLocation, deviceCoords, locating, locationError } =
    useLocationContext();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUseCurrentLocation = async () => {
    setError(null);
    const granted = permissionStatus === 'granted' || (await requestPermission());
    if (!granted) {
      setError('Location permission was denied. Enable it in system settings, or search for your area below.');
      return;
    }
    // Only discard a manually chosen city once the device has actually given us
    // somewhere to put in its place. Clearing first meant a failed fix left the
    // app with no location at all, having thrown away one that worked.
    const located = await refreshLocation();
    if (!located) {
      setError(locationError ?? 'Could not get your location. Try again, or search for your area below.');
      return;
    }
    setManualLocation(null);
    navigation.goBack();
  };

  /**
   * Geocodes through our own API rather than `expo-location`.
   *
   * `Location.geocodeAsync` needs the foreground location permission on
   * Android, which is exactly what the visitor on this screen has usually just
   * declined - so the one escape route from a refused permission failed for the
   * same reason the permission did, and said only "Could not search for that
   * location right now." `/geo/search` needs no device permission and no
   * account, and it is the same geocoder the merchant pickers use, which §23
   * asks of the location model.
   */
  const onSearch = async () => {
    const text = query.trim();
    if (!text) return;
    // The server asks for three characters; saying so here saves a round trip
    // and a validation error written for a form, not for this field.
    if (text.length < 3) {
      setError('Type at least three characters.');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const results = await geoApi.searchPlaces(text);
      if (results.length === 0) {
        setError('Could not find that place. Try a different city, area, or pincode.');
        return;
      }
      const [best] = results;
      // The geocoder's own label is a full postal address; the chip that shows
      // this has room for a city. What the visitor typed is the last resort.
      setManualLocation({
        label: best.address.city ?? best.label ?? text,
        latitude: best.latitude,
        longitude: best.longitude,
      });
      navigation.goBack();
    } catch (err) {
      // §36 and §50 have their own wording for offline and for a timeout, and
      // either is likelier here than a geocoder that has nothing to say.
      setError(getApiErrorMessage(err, 'Could not search for that location right now.'));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm, marginBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>Select Location</Text>
      </View>

      <View style={{ paddingHorizontal: spacing.md, gap: spacing.md }}>
        <Button
          label={deviceCoords ? 'Refresh Current Location' : 'Use Current Location'}
          icon={<Ionicons name="locate-outline" size={16} color={colors.textOnBrand} />}
          onPress={onUseCurrentLocation}
          loading={locating}
          fullWidth
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ color: colors.textSubtle, fontSize: fontSizes.xs }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        <TextField
          label="City, Area, or Pincode"
          placeholder="e.g. Koramangala, Bengaluru"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={onSearch}
          leftIcon="search-outline"
        />
        {error ? <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>{error}</Text> : null}
        <Button label="Search" variant="secondary" onPress={onSearch} loading={searching} fullWidth />
      </View>
    </Screen>
  );
}
