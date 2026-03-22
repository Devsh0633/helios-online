import * as THREE from 'three';

export const SPACE_CENTERS = {
  NASA: {
    lat: 28.5721,
    lng: -80.648,
    country: ['US'],
    name: 'Kennedy Space Center, Florida'
  },
  ISRO: {
    lat: 13.7199,
    lng: 80.2304,
    country: ['IN'],
    name: 'Satish Dhawan Space Centre, India'
  },
  ROSCOSMOS: {
    lat: 45.9201,
    lng: 63.3422,
    country: ['RU', 'KZ'],
    name: 'Baikonur Cosmodrome, Kazakhstan'
  },
  ESA: {
    lat: 5.2384,
    lng: -52.7685,
    country: ['FR', 'DE', 'IT', 'ES', 'GB', 'NL', 'BE', 'CH', 'SE', 'NO', 'DK', 'AT', 'FI', 'PT', 'IE', 'GR', 'LU', 'CZ', 'RO', 'PL', 'HU'],
    name: 'Guiana Space Centre, French Guiana'
  },
  JAXA: {
    lat: 30.4013,
    lng: 130.9681,
    country: ['JP'],
    name: 'Tanegashima Space Center, Japan'
  },
  CNSA: {
    lat: 41.1182,
    lng: 100.3186,
    country: ['CN'],
    name: 'Jiuquan Satellite Launch Center, China'
  },
  AEB: {
    lat: -2.3098,
    lng: -44.3968,
    country: ['BR'],
    name: 'Alcantara Launch Center, Brazil'
  },
  DEFAULT: {
    lat: 51.6,
    lng: 0,
    country: [],
    name: 'International Space Station Orbit'
  }
};

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const dLat = degToRad(lat2 - lat1);
  const dLng = degToRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat1)) *
      Math.cos(degToRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60_000,
      ...options
    });
  });
}

async function getCountryCode() {
  try {
    const response = await fetch('https://ipapi.co/json/');

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.country_code ?? null;
  } catch {
    return null;
  }
}

function resolveBestCenter(coords, countryCode) {
  const entries = Object.entries(SPACE_CENTERS).filter(([key]) => key !== 'DEFAULT');
  const countryMatch = entries.find(([, center]) => center.country.includes(countryCode));

  if (countryMatch) {
    return countryMatch[1];
  }

  if (!coords) {
    return SPACE_CENTERS.NASA;
  }

  let bestCenter = SPACE_CENTERS.NASA;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [, center] of entries) {
    const distance = haversineKm(coords.lat, coords.lng, center.lat, center.lng);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestCenter = center;
    }
  }

  return bestCenter;
}

export async function resolveGeoSpawn(solarSystem) {
  const earth = solarSystem.getBodyByName('Earth');

  if (!earth) {
    throw new Error('Earth body is unavailable for geospatial spawning.');
  }

  let coords = null;
  let denied = false;

  try {
    const position = await getCurrentPosition();
    coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
  } catch (error) {
    denied = true;
  }

  if (denied) {
    coords = {
      lat: SPACE_CENTERS.NASA.lat,
      lng: SPACE_CENTERS.NASA.lng
    };
  }

  const countryCode = coords ? await getCountryCode() : null;
  const center = denied ? SPACE_CENTERS.NASA : resolveBestCenter(coords, countryCode);
  const spawnLat = center.lat;
  const spawnLng = center.lng;

  const normal = earth.getWorldSurfaceNormalFromLatLng(spawnLat, spawnLng, new THREE.Vector3());
  const position = earth.getWorldSurfacePointFromLatLng(
    spawnLat,
    spawnLng,
    solarSystem.getShipSpawnOffsetUnits(),
    new THREE.Vector3()
  );
  const eastDirection = earth.getWorldEastDirectionFromLatLng(spawnLat, spawnLng, new THREE.Vector3());

  return {
    body: earth,
    position,
    normal,
    forward: eastDirection,
    label: center.name,
    countryCode,
    lat: spawnLat,
    lng: spawnLng
  };
}
