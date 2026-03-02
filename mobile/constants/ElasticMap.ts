/**
 * Elastic Maps Service (EMS) configuration for basemap tiles and styles.
 * @see https://www.elastic.co/elastic-maps-service
 * @see https://elastic.co/docs/explore-analyze/visualize/maps/maps-connect-to-ems
 */

const EMS_TILE_BASE = 'https://tiles.maps.elastic.co';
const EMS_VERSION = 'v9.0';

/** Required query params for EMS ToS (use in style URL and transformRequest). */
export const EMS_TOS_PARAMS = 'elastic_tile_service_tos=agree&my_app_name=flood-warning-app&my_app_version=1.0.0';

/** EMS vector style URLs (MapLibre GL compatible). */
export const EMS_STYLES = {
  /** Light, desaturated (default). */
  light: `${EMS_TILE_BASE}/${EMS_VERSION}/styles/osm-bright-desaturated/style.json?${EMS_TOS_PARAMS}`,
  /** Classic OSM bright. */
  classic: `${EMS_TILE_BASE}/${EMS_VERSION}/styles/osm-bright/style.json?${EMS_TOS_PARAMS}`,
  /** Dark. */
  dark: `${EMS_TILE_BASE}/${EMS_VERSION}/styles/dark-matter/style.json?${EMS_TOS_PARAMS}`,
  /** Light blue (Borealis). */
  lightBlue: `${EMS_TILE_BASE}/${EMS_VERSION}/styles/borealis-light/style.json?${EMS_TOS_PARAMS}`,
  /** Dark blue (Borealis). */
  darkBlue: `${EMS_TILE_BASE}/${EMS_VERSION}/styles/borealis-dark/style.json?${EMS_TOS_PARAMS}`,
} as const;

/** Default EMS style for the app. */
export const EMS_DEFAULT_STYLE = EMS_STYLES.light;

/** Base URL for EMS tile server (for transformRequest to append ToS params). */
export const EMS_ORIGIN = EMS_TILE_BASE;

/** Base URL to resolve relative paths in EMS style JSON (no trailing slash). */
export const EMS_STYLE_BASE = `${EMS_TILE_BASE}/${EMS_VERSION}`;

/** EMS raster tile URL for react-native-maps UrlTile (XYZ). Use with mapType="none" to show only EMS. */
export const EMS_RASTER_TILE_URL = `${EMS_TILE_BASE}/styles/osm-bright-desaturated/{z}/{x}/{y}.png?${EMS_TOS_PARAMS}`;
