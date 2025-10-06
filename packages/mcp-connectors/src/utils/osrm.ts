export interface RouteWaypoint {
  lat: number;
  lon: number;
}

export interface OSRMRouteResponse {
  geometry: {
    coordinates: [number, number][];
  };
  distance: number;
  duration: number;
  legs: Array<{
    steps: Array<{
      geometry: {
        coordinates: [number, number][];
      };
      maneuver: {
        type: string;
        instruction: string;
        location: [number, number];
      };
      name: string;
      distance: number;
      duration: number;
    }>;
    distance: number;
    duration: number;
  }>;
}

export interface RoutingOptions {
  baseUrl?: string;
  profile?: 'cycling' | 'walking' | 'driving' | 'foot';
}

export async function routeWithOSRM(
  waypoints: RouteWaypoint[],
  opts?: RoutingOptions
): Promise<OSRMRouteResponse> {
  if (!waypoints?.length) {
    throw new Error('No waypoints provided');
  }

  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints required for routing');
  }

  const base = (opts?.baseUrl || 'https://router.project-osrm.org').replace(/\/+$/, '');
  const profile = opts?.profile || 'cycling';
  const coords = waypoints.map((w) => `${w.lon},${w.lat}`).join(';');

  const url = `${base}/route/v1/${profile}/${coords}?geometries=geojson&overview=full&steps=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM error ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as Record<string, unknown>;

  if (json.code !== 'Ok') {
    throw new Error(
      `OSRM routing failed: ${(json.message as string) || (json.code as string)}`
    );
  }

  const route = json.routes?.[0];
  if (!route) {
    throw new Error('No route returned from OSRM');
  }

  return route;
}

export async function routeWithMapbox(
  waypoints: RouteWaypoint[],
  accessToken: string,
  opts?: {
    profile?: 'cycling' | 'walking' | 'driving';
    optimize?: boolean;
  }
): Promise<OSRMRouteResponse> {
  if (!waypoints?.length) {
    throw new Error('No waypoints provided');
  }

  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints required for routing');
  }

  const profile = opts?.profile || 'cycling';
  const coords = waypoints.map((w) => `${w.lon},${w.lat}`).join(';');
  const optimize = opts?.optimize ? 'true' : 'false';

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
    `?geometries=geojson&overview=full&steps=true&optimize=${optimize}&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Mapbox error ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as Record<string, unknown>;

  if (json.code !== 'Ok') {
    throw new Error(
      `Mapbox routing failed: ${(json.message as string) || (json.code as string)}`
    );
  }

  const route = json.routes?.[0];
  if (!route) {
    throw new Error('No route returned from Mapbox');
  }

  return route;
}

export function extractTurnByTurnDirections(route: OSRMRouteResponse): Array<{
  instruction: string;
  distance_m: number;
  location: [number, number];
  type: string;
}> {
  const directions: Array<{
    instruction: string;
    distance_m: number;
    location: [number, number];
    type: string;
  }> = [];

  for (const leg of route.legs) {
    for (const step of leg.steps) {
      directions.push({
        instruction: step.maneuver.instruction,
        distance_m: step.distance,
        location: step.maneuver.location,
        type: step.maneuver.type,
      });
    }
  }

  return directions;
}
