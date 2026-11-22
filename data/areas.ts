export const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  "D Ground": { lat: 31.4106, lng: 73.1128 },
  "Peoples Colony No. 1": { lat: 31.4085, lng: 73.1165 },
  "Peoples Colony No. 2": { lat: 31.4021, lng: 73.1052 },
  "Peoples Colony": { lat: 31.4085, lng: 73.1165 },
  "Kohinoor City": { lat: 31.4139, lng: 73.1201 },
  "Susan Road": { lat: 31.4215, lng: 73.1235 },
  "Madina Town": { lat: 31.4265, lng: 73.1168 },
  "Model Town": { lat: 31.4231, lng: 73.0762 },
  "Eden Valley": { lat: 31.4425, lng: 73.1492 },
  "Civil Lines": { lat: 31.4287, lng: 73.0856 },
  "Canal Road": { lat: 31.4351, lng: 73.1324 },
  "Batala Colony": { lat: 31.3965, lng: 73.1011 },
  "Gulberg": { lat: 31.4218, lng: 73.0684 },
  "Samanabad": { lat: 31.3948, lng: 73.0725 },
};

export const FAISALABAD_AREAS = Object.keys(AREA_COORDS).filter(
  (a) => a !== "Peoples Colony"
);

export function calculateDeliveryFee(
  restaurantArea: string,
  customerArea: string
): { fee: number; distanceKm: number } {
  if (!customerArea) return { fee: 130, distanceKm: 0 };
  if (restaurantArea.toLowerCase() === customerArea.toLowerCase()) {
    return { fee: 80, distanceKm: 0.8 };
  }

  const from = AREA_COORDS[restaurantArea];
  const to = AREA_COORDS[customerArea];

  if (!from || !to) return { fee: 150, distanceKm: 3.5 };

  // Haversine formula (straight-line km) * 1.3 for Faisalabad road distance
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const roadKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3).toFixed(1));

  if (roadKm <= 1.5) return { fee: 80, distanceKm: roadKm };
  if (roadKm <= 4.0) return { fee: 130, distanceKm: roadKm };
  if (roadKm <= 7.0) return { fee: 180, distanceKm: roadKm };
  return { fee: 250, distanceKm: roadKm };
}