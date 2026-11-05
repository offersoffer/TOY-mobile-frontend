/**
 * Where the map tiles come from.
 *
 * Mirrors `TOY-frontend/src/environments/environment.ts` so web and mobile
 * draw the same map from the same source, and so swapping OpenStreetMap's
 * servers for a commercial provider is a one-line change on each side.
 *
 * Tiles are raster images fetched over plain HTTP, which is why the seller
 * wizard needs no Google Maps key and therefore no native module: a public
 * signup should not be the one screen that fails on a build where the key is
 * missing.
 *
 * OpenStreetMap's tile servers are donated infrastructure with a usage policy
 * (https://operations.osmfoundation.org/policies/tiles/): no bulk downloading,
 * attribution displayed, and heavy applications expected to move to their own
 * or a commercial provider. The picker honours the first two - it fetches only
 * the tiles on screen, and draws the attribution over the map - and the third
 * is why this is configuration rather than a constant in the component.
 */

export const MAP_TILE_URL =
  process.env.EXPO_PUBLIC_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_ATTRIBUTION = process.env.EXPO_PUBLIC_MAP_ATTRIBUTION ?? '© OpenStreetMap contributors';

/** Side of a raster tile in pixels; 256 is the scheme every provider uses. */
export const TILE_SIZE = 256;

export const MIN_ZOOM = 3;
export const MAX_ZOOM = 19;

/** Web Mercator is undefined at the poles; this is where the projection stops. */
export const MAX_LATITUDE = 85.05112878;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// ---- Web Mercator ---------------------------------------------------------
// The projection every raster tile scheme uses. World pixel coordinates run
// 0..TILE_SIZE*2^zoom on both axes, which is what makes a tile's x/y its
// pixel offset divided by its size.

export const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom;

export const lngToWorldX = (lng: number, zoom: number) => ((lng + 180) / 360) * worldSize(zoom);

export const latToWorldY = (lat: number, zoom: number) => {
  const sin = Math.sin((clamp(lat, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180);
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize(zoom);
};

export const worldXToLng = (x: number, zoom: number) => (x / worldSize(zoom)) * 360 - 180;

export const worldYToLat = (y: number, zoom: number) => {
  const n = Math.PI - (2 * Math.PI * y) / worldSize(zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/** Keeps a longitude in -180..180 after a pan has carried it past the date line. */
export const wrapLongitude = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

export const tileUrl = (zoom: number, x: number, y: number) =>
  MAP_TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y));
