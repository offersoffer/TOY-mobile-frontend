import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme';
import { Button, TextField } from './ui';
import { geoApi } from '../api';
import type { GeoPlace, LocationSource } from '../types';
import type { PickedLocation } from './MapLocationPicker';
import {
  MAP_ATTRIBUTION,
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_SIZE,
  clamp,
  latToWorldY,
  lngToWorldX,
  tileUrl,
  worldXToLng,
  worldYToLat,
  wrapLongitude,
  worldSize,
} from '../utils/map';

export type { PickedLocation };

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  /** Seeds the search box for a shop that has an address but no pin yet. */
  addressHint?: string;
  /** Height of the map surface; the default is about a third of a phone. */
  height?: number;
  onConfirm: (location: PickedLocation) => void;
}

interface Tile {
  key: string;
  url: string;
  left: number;
  top: number;
}

/** Coimbatore, where the pilot merchants are. Only used with nothing better. */
const FALLBACK = { latitude: 11.0168, longitude: 76.9558 };
/** Close enough to pick a shop front out of a row of them. */
const STREET_ZOOM = 17;
/** How far two fingers must spread before it counts as one zoom level. */
const PINCH_STEP = 1.55;

const distance = (touches: { pageX: number; pageY: number }[]) =>
  Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);

/**
 * Shop location picker drawn from raster map tiles (Onboarding §7).
 *
 * The same control as `MapLocationPicker` and the same three ways to place a
 * pin - search an address, drag the map, or use the device's own position -
 * but built on OpenStreetMap tiles and a `PanResponder` instead of
 * `react-native-maps`.
 *
 * That is the whole point of it. `MapLocationPicker` cannot construct a
 * `MapView` on Android without a Google Maps API key, and falls back to a
 * "Map unavailable" box when the build has none. For the merchant admin app
 * that is a tolerable degradation; for a public self-service signup it is not,
 * because §7 makes confirming the pin on a map a required step and a seller
 * cannot confirm a map they cannot see. Tiles are just images over HTTP, so
 * this works on every build.
 *
 * It is a direct port of the web `MapPickerComponent`, deliberately: §23 asks
 * for web and mobile to behave identically, and the projection maths is the
 * part where "nearly the same" would put the two platforms' pins in different
 * places. Both now read the same Web Mercator helpers.
 *
 * The pin sits fixed at the centre and the map moves under it - the gesture
 * every map app on a phone already teaches, and it avoids asking someone to
 * drag a marker they cannot see under their own thumb.
 */
export function TileMapPicker({ latitude, longitude, addressHint, height = 260, onConfirm }: Props) {
  const { colors, spacing, fontSizes, fontWeights, radii } = useTheme();

  const [centre, setCentre] = useState({
    latitude: latitude ?? FALLBACK.latitude,
    longitude: longitude ?? FALLBACK.longitude,
  });
  const [zoom, setZoom] = useState(latitude != null ? STREET_ZOOM : 13);
  const [size, setSize] = useState({ width: 0, height });

  const [source, setSource] = useState<LocationSource>('MANUAL');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  // Coordinates that already exist were confirmed when they were saved; §7's
  // confirmation is only owed again once the pin moves.
  const [confirmed, setConfirmed] = useState(latitude != null);

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [resolved, setResolved] = useState<GeoPlace | null>(null);
  const [resolving, setResolving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  /**
   * The live drag, in pixels, applied to the tile layer as a transform.
   *
   * A finger drag fires a move event per frame. Turning each one into a
   * `setState` would re-render twenty tile images sixty times a second, which
   * on a mid-range Android phone is visibly worse than the map not moving at
   * all. So the drag only moves the existing tiles, and the centre - the thing
   * everything else is derived from - is recomputed once, on release.
   */
  const drag = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offset = useRef({ x: 0, y: 0 });
  const pinchBase = useRef<number | null>(null);

  /**
   * Reverse lookups are debounced and the stale ones discarded: without this
   * the address flickers between answers to questions the seller has already
   * moved on from.
   */
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseToken = useRef(0);

  const resolveAddress = useCallback((next: { latitude: number; longitude: number }) => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    setResolving(true);
    const token = ++reverseToken.current;
    reverseTimer.current = setTimeout(() => {
      geoApi
        .reverseGeocode(next.latitude, next.longitude)
        .then((place) => {
          if (token !== reverseToken.current) return;
          setResolved(place);
          setResolving(false);
        })
        // A geocoder that cannot name the spot changes nothing: the pin the
        // seller placed is still the location being saved.
        .catch(() => token === reverseToken.current && setResolving(false));
    }, 600);
  }, []);

  useEffect(() => {
    if (latitude != null && longitude != null) resolveAddress({ latitude, longitude });
    return () => {
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
    };
    // Only on mount: after that the seller is driving the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A shop being registered usually has an address and no pin, so the search
  // runs itself rather than making the seller retype what they just entered.
  useEffect(() => {
    if (latitude != null || !addressHint) return;
    setTerm(addressHint);
    void runSearch(addressHint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Moves the centre by a pixel offset. Any movement invalidates a previous
   * confirmation - §7 has the seller confirming a pin, not a shop.
   */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      setCentre((current) => {
        const x = lngToWorldX(current.longitude, zoom) - dx;
        const y = clamp(latToWorldY(current.latitude, zoom) - dy, 0, worldSize(zoom));
        const next = {
          latitude: worldYToLat(y, zoom),
          longitude: wrapLongitude(worldXToLng(x, zoom)),
        };
        resolveAddress(next);
        return next;
      });
      setSource('MAP_PIN');
      setAccuracy(null);
      setPlaceId(null);
      setConfirmed(false);
    },
    [zoom, resolveAddress],
  );

  /** Zoom keeps the centre - and therefore the pin - exactly where it is. */
  const zoomBy = useCallback((delta: number) => {
    setZoom((value) => clamp(value + delta, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // The map is inside a ScrollView, so it has to claim the gesture or
        // the page scrolls instead of the map panning.
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: () => {
          offset.current = { x: 0, y: 0 };
          drag.setValue({ x: 0, y: 0 });
          pinchBase.current = null;
          setResults([]);
        },

        onPanResponderMove: (event, gesture) => {
          const touches = event.nativeEvent.touches;

          if (touches.length >= 2) {
            // Pinch. The tile grid is drawn at whole zoom levels, so rather
            // than scale the tiles - which would show the seller a blurred
            // map and then snap - a spread past the threshold steps one level
            // and rebases. Dragging is suspended while two fingers are down.
            const spread = distance(touches as { pageX: number; pageY: number }[]);
            if (pinchBase.current === null) {
              pinchBase.current = spread;
              return;
            }
            const ratio = spread / pinchBase.current;
            if (ratio > PINCH_STEP) {
              zoomBy(1);
              pinchBase.current = spread;
            } else if (ratio < 1 / PINCH_STEP) {
              zoomBy(-1);
              pinchBase.current = spread;
            }
            return;
          }

          pinchBase.current = null;
          offset.current = { x: gesture.dx, y: gesture.dy };
          drag.setValue({ x: gesture.dx, y: gesture.dy });
        },

        onPanResponderRelease: () => {
          const { x, y } = offset.current;
          drag.setValue({ x: 0, y: 0 });
          offset.current = { x: 0, y: 0 };
          pinchBase.current = null;
          // A tap is not a pan. Below a couple of pixels this is someone
          // touching the map, and moving the pin would silently discard a
          // confirmation they already gave.
          if (Math.abs(x) > 2 || Math.abs(y) > 2) panBy(x, y);
        },

        onPanResponderTerminate: () => {
          drag.setValue({ x: 0, y: 0 });
          offset.current = { x: 0, y: 0 };
          pinchBase.current = null;
        },
      }),
    [drag, panBy, zoomBy],
  );

  /**
   * The tiles covering the surface, positioned relative to its top-left.
   *
   * One extra ring on every side, so a drag reveals loaded tiles rather than
   * blank ground.
   */
  const tiles = useMemo<Tile[]>(() => {
    if (!size.width || !size.height) return [];

    const count = 2 ** zoom;
    const left = lngToWorldX(centre.longitude, zoom) - size.width / 2;
    const top = latToWorldY(centre.latitude, zoom) - size.height / 2;

    const firstX = Math.floor(left / TILE_SIZE) - 1;
    const firstY = Math.floor(top / TILE_SIZE) - 1;
    const lastX = Math.floor((left + size.width) / TILE_SIZE) + 1;
    const lastY = Math.floor((top + size.height) / TILE_SIZE) + 1;

    const list: Tile[] = [];
    for (let y = firstY; y <= lastY; y += 1) {
      // Above the north pole or below the south there is nothing to draw.
      if (y < 0 || y >= count) continue;
      for (let x = firstX; x <= lastX; x += 1) {
        // Longitude wraps, so a map panned past the date line repeats.
        const wrapped = ((x % count) + count) % count;
        list.push({
          key: `${zoom}/${x}/${y}`,
          url: tileUrl(zoom, wrapped, y),
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top,
        });
      }
    }
    return list;
  }, [centre, zoom, size]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height: measured } = event.nativeEvent.layout;
    setSize((current) =>
      Math.abs(current.width - width) < 1 && Math.abs(current.height - measured) < 1
        ? current
        : { width, height: measured },
    );
  };

  async function runSearch(query: string) {
    const text = query.trim();
    if (text.length < 3) return;
    setSearching(true);
    setSearched(true);
    try {
      setResults(await geoApi.searchPlaces(text));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  const moveTo = (next: { latitude: number; longitude: number }) => {
    setCentre(next);
    setZoom((value) => Math.max(value, STREET_ZOOM));
  };

  /** §7 by address search: the result drops the pin, which stays adjustable. */
  const choosePlace = (place: GeoPlace) => {
    moveTo({ latitude: place.latitude, longitude: place.longitude });
    setSource('ADDRESS_SEARCH');
    setAccuracy(null);
    setPlaceId(place.placeId);
    setResolved(place);
    setResults([]);
    setSearched(false);
    setConfirmed(false);
    setNotice('Pin placed from the search. Drag the map if it is not exactly right.');
  };

  /** §7 by GPS, for a seller standing in their own shop. */
  const useCurrentLocation = async () => {
    setLocating(true);
    setNotice(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setNotice('Location permission was refused. Search for the address or drag the pin instead.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      moveTo({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setSource('CURRENT_LOCATION');
      const metres = position.coords.accuracy ?? null;
      setAccuracy(metres);
      setPlaceId(null);
      setConfirmed(false);
      // An imprecise fix is still a useful starting point, so this says what
      // it is rather than refusing it.
      setNotice(
        metres != null
          ? `Located to about ${Math.round(metres)} m. Drag the map to fine-tune the pin.`
          : 'Located. Drag the map to fine-tune the pin.',
      );
      resolveAddress(position.coords);
    } catch {
      setNotice('Your location could not be read. Search for the address or drag the pin instead.');
    } finally {
      setLocating(false);
    }
  };

  /** §7: nothing counts as confirmed until the seller says this is their shop. */
  const confirm = () => {
    setConfirmed(true);
    setNotice(null);
    onConfirm({
      latitude: Number(centre.latitude.toFixed(7)),
      longitude: Number(centre.longitude.toFixed(7)),
      source,
      accuracy,
      placeId,
      address: resolved?.address ?? null,
      label: resolved?.label ?? null,
    });
  };

  const zoomButton = (label: string, delta: number, disabled: boolean, hint: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      onPress={() => zoomBy(delta)}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.sm,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.semibold }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ gap: spacing.xs }}>
        <TextField
          label="Search for the shop address"
          value={term}
          onChangeText={(value) => {
            setTerm(value);
            setSearched(false);
          }}
          onSubmitEditing={() => runSearch(term)}
          returnKeyType="search"
          leftIcon="search-outline"
          placeholder="e.g. RS Puram, Coimbatore"
        />

        {searching ? <ActivityIndicator color={colors.brand} /> : null}

        {results.map((place) => (
          <Pressable
            key={place.placeId ?? place.label ?? `${place.latitude},${place.longitude}`}
            accessibilityRole="button"
            onPress={() => choosePlace(place)}
            style={{
              padding: spacing.sm,
              borderRadius: radii.sm,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSizes.sm }}>{place.label}</Text>
          </Pressable>
        ))}

        {searched && !searching && results.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            Nothing found. Try a nearby landmark, or drag the map to the shop instead.
          </Text>
        ) : null}
      </View>

      <View
        onLayout={onLayout}
        accessibilityLabel="Map of the shop location. Drag the map to move the pin, then confirm the location."
        style={{
          height,
          borderRadius: radii.md,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          // Shows through until the first tiles land, so the surface never
          // flashes the page colour at the seller.
          backgroundColor: colors.surfaceAlt,
        }}
        {...responder.panHandlers}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateX: drag.x }, { translateY: drag.y }],
          }}
        >
          {tiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.url }}
              style={{ position: 'absolute', left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
              contentFit="fill"
              // Tiles are immutable for a given z/x/y, so a cache hit is
              // always correct and panning back over ground the seller has
              // already seen costs nothing.
              cachePolicy="disk"
              transition={0}
            />
          ))}
        </Animated.View>

        {/*
          The pin is an overlay pinned to the centre rather than something
          drawn on the map, so it never lags behind during a drag - the pin is
          the crosshair, and the ground moves under it.
        */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="location" size={38} color={colors.brand} style={{ marginBottom: 34 }} />
        </View>

        <View style={{ position: 'absolute', right: spacing.xs, top: spacing.xs, gap: spacing.xxs }}>
          {zoomButton('+', 1, zoom >= MAX_ZOOM, 'Zoom in')}
          {zoomButton('−', -1, zoom <= MIN_ZOOM, 'Zoom out')}
        </View>

        {/* Required by the tile provider's terms, so it is drawn on the map. */}
        <Text
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            paddingHorizontal: spacing.xxs,
            fontSize: fontSizes.xxs,
            color: colors.textMuted,
            backgroundColor: colors.surface,
          }}
        >
          {MAP_ATTRIBUTION}
        </Text>
      </View>

      <Button
        label={locating ? 'Locating…' : 'Use my current location'}
        variant="secondary"
        onPress={useCurrentLocation}
        disabled={locating}
        icon={<Ionicons name="locate-outline" size={16} color={colors.text} />}
        fullWidth
      />

      {notice ? <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{notice}</Text> : null}

      <View style={{ gap: spacing.xxs }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] }}>
          📍 {centre.latitude.toFixed(5)}, {centre.longitude.toFixed(5)}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
          {resolving
            ? 'Looking up this spot…'
            : (resolved?.label ?? 'Drag the map so the pin sits on your shop front.')}
        </Text>
      </View>

      <Button
        label={confirmed ? 'Location confirmed' : 'Confirm location'}
        onPress={confirm}
        disabled={confirmed}
        icon={confirmed ? <Ionicons name="checkmark-circle" size={16} color={colors.text} /> : undefined}
        fullWidth
      />
    </View>
  );
}
