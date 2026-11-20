/**
 * A small city list bundled with the app, so finding your place works offline and sends nothing anywhere.
 * [name, ISO country code, latitude, longitude]. Coordinates are city centres to two decimals
 * (0.01° is well under a minute of prayer time). If a city is missing, onboarding takes coordinates instead.
 */
export type City = { name: string; country: string; lat: number; lng: number };

export const COUNTRIES: Record<string, string> = {
  IN: "India", PK: "Pakistan", BD: "Bangladesh", AF: "Afghanistan", LK: "Sri Lanka", NP: "Nepal", MV: "Maldives",
  SA: "Saudi Arabia", AE: "United Arab Emirates", QA: "Qatar", KW: "Kuwait", BH: "Bahrain", OM: "Oman", YE: "Yemen",
  EG: "Egypt", JO: "Jordan", PS: "Palestine", LB: "Lebanon", SY: "Syria", IQ: "Iraq", IR: "Iran", TR: "Turkey",
  MA: "Morocco", DZ: "Algeria", TN: "Tunisia", LY: "Libya", SD: "Sudan", NG: "Nigeria", SN: "Senegal", KE: "Kenya",
  TZ: "Tanzania", SO: "Somalia", ET: "Ethiopia", ZA: "South Africa", MY: "Malaysia", SG: "Singapore", ID: "Indonesia",
  BN: "Brunei", PH: "Philippines", TH: "Thailand", CN: "China", JP: "Japan", KR: "South Korea", HK: "Hong Kong",
  GB: "United Kingdom", IE: "Ireland", FR: "France", DE: "Germany", NL: "Netherlands", BE: "Belgium", ES: "Spain",
  IT: "Italy", SE: "Sweden", NO: "Norway", DK: "Denmark", BA: "Bosnia and Herzegovina", RU: "Russia", KZ: "Kazakhstan",
  UZ: "Uzbekistan", US: "United States", CA: "Canada", BR: "Brazil", AR: "Argentina", MX: "Mexico", AU: "Australia", NZ: "New Zealand",
};

const RAW: [string, string, number, number][] = [
  // India
  ["Lucknow", "IN", 26.85, 80.95], ["Delhi", "IN", 28.61, 77.21], ["Mumbai", "IN", 19.08, 72.88], ["Bengaluru", "IN", 12.97, 77.59],
  ["Hyderabad", "IN", 17.39, 78.49], ["Chennai", "IN", 13.08, 80.27], ["Kolkata", "IN", 22.57, 88.36], ["Pune", "IN", 18.52, 73.86],
  ["Ahmedabad", "IN", 23.02, 72.57], ["Jaipur", "IN", 26.91, 75.79], ["Kanpur", "IN", 26.45, 80.33], ["Patna", "IN", 25.59, 85.14],
  ["Bhopal", "IN", 23.26, 77.41], ["Srinagar", "IN", 34.08, 74.8], ["Jammu", "IN", 32.73, 74.86], ["Aligarh", "IN", 27.88, 78.08],
  ["Kochi", "IN", 9.93, 76.27], ["Kozhikode", "IN", 11.26, 75.78], ["Malappuram", "IN", 11.07, 76.07], ["Thiruvananthapuram", "IN", 8.52, 76.94],
  ["Varanasi", "IN", 25.32, 82.97], ["Agra", "IN", 27.18, 78.01], ["Prayagraj", "IN", 25.44, 81.85], ["Nagpur", "IN", 21.15, 79.09],
  ["Surat", "IN", 21.17, 72.83], ["Indore", "IN", 22.72, 75.86], ["Chandigarh", "IN", 30.73, 76.78], ["Guwahati", "IN", 26.14, 91.74],
  ["Bhubaneswar", "IN", 20.3, 85.82], ["Ranchi", "IN", 23.34, 85.31], ["Mangaluru", "IN", 12.91, 74.86], ["Moradabad", "IN", 28.84, 78.77],
  ["Bareilly", "IN", 28.37, 79.43], ["Meerut", "IN", 28.98, 77.71], ["Rampur", "IN", 28.8, 79.03], ["Deoband", "IN", 29.69, 77.68],
  ["Gorakhpur", "IN", 26.76, 83.37], ["Visakhapatnam", "IN", 17.69, 83.22], ["Coimbatore", "IN", 11.02, 76.96], ["Madurai", "IN", 9.93, 78.12],
  ["Mysuru", "IN", 12.3, 76.64], ["Aurangabad", "IN", 19.88, 75.34], ["Dehradun", "IN", 30.32, 78.03], ["Panaji", "IN", 15.49, 73.83],
  ["Raipur", "IN", 21.25, 81.63], ["Noida", "IN", 28.54, 77.39], ["Gurugram", "IN", 28.46, 77.03],
  // South Asia
  ["Karachi", "PK", 24.86, 67.01], ["Lahore", "PK", 31.55, 74.34], ["Islamabad", "PK", 33.68, 73.05], ["Rawalpindi", "PK", 33.6, 73.04],
  ["Faisalabad", "PK", 31.42, 73.08], ["Peshawar", "PK", 34.01, 71.58], ["Quetta", "PK", 30.18, 66.98], ["Multan", "PK", 30.2, 71.47],
  ["Dhaka", "BD", 23.81, 90.41], ["Chattogram", "BD", 22.36, 91.78], ["Sylhet", "BD", 24.89, 91.87], ["Kabul", "AF", 34.56, 69.21],
  ["Colombo", "LK", 6.93, 79.86], ["Kathmandu", "NP", 27.72, 85.32], ["Malé", "MV", 4.18, 73.51],
  // Middle East
  ["Makkah", "SA", 21.39, 39.86], ["Madinah", "SA", 24.47, 39.61], ["Riyadh", "SA", 24.71, 46.68], ["Jeddah", "SA", 21.49, 39.19],
  ["Dammam", "SA", 26.43, 50.1], ["Dubai", "AE", 25.2, 55.27], ["Abu Dhabi", "AE", 24.45, 54.38], ["Sharjah", "AE", 25.35, 55.42],
  ["Doha", "QA", 25.29, 51.53], ["Kuwait City", "KW", 29.38, 47.99], ["Manama", "BH", 26.23, 50.59], ["Muscat", "OM", 23.59, 58.41],
  ["Sana'a", "YE", 15.37, 44.19], ["Cairo", "EG", 30.04, 31.24], ["Alexandria", "EG", 31.2, 29.92], ["Amman", "JO", 31.95, 35.93],
  ["Jerusalem", "PS", 31.78, 35.23], ["Gaza", "PS", 31.5, 34.47], ["Beirut", "LB", 33.89, 35.5], ["Damascus", "SY", 33.51, 36.28],
  ["Baghdad", "IQ", 33.31, 44.37], ["Tehran", "IR", 35.69, 51.39], ["Istanbul", "TR", 41.01, 28.98], ["Ankara", "TR", 39.93, 32.86],
  // Africa
  ["Casablanca", "MA", 33.57, -7.59], ["Rabat", "MA", 34.02, -6.84], ["Algiers", "DZ", 36.75, 3.06], ["Tunis", "TN", 36.81, 10.18],
  ["Tripoli", "LY", 32.89, 13.19], ["Khartoum", "SD", 15.5, 32.56], ["Lagos", "NG", 6.52, 3.38], ["Kano", "NG", 12.0, 8.52],
  ["Abuja", "NG", 9.08, 7.4], ["Dakar", "SN", 14.72, -17.47], ["Nairobi", "KE", -1.29, 36.82], ["Mombasa", "KE", -4.04, 39.67],
  ["Dar es Salaam", "TZ", -6.79, 39.21], ["Mogadishu", "SO", 2.05, 45.32], ["Addis Ababa", "ET", 9.03, 38.74],
  ["Johannesburg", "ZA", -26.2, 28.05], ["Cape Town", "ZA", -33.92, 18.42], ["Durban", "ZA", -29.86, 31.02],
  // East and South-East Asia
  ["Kuala Lumpur", "MY", 3.14, 101.69], ["Singapore", "SG", 1.35, 103.82], ["Jakarta", "ID", -6.21, 106.85], ["Surabaya", "ID", -7.25, 112.75],
  ["Bandar Seri Begawan", "BN", 4.9, 114.94], ["Manila", "PH", 14.6, 120.98], ["Bangkok", "TH", 13.76, 100.5], ["Beijing", "CN", 39.9, 116.41],
  ["Ürümqi", "CN", 43.83, 87.62], ["Tokyo", "JP", 35.68, 139.69], ["Seoul", "KR", 37.57, 126.98], ["Hong Kong", "HK", 22.32, 114.17],
  // Europe
  ["London", "GB", 51.51, -0.13], ["Birmingham", "GB", 52.49, -1.89], ["Manchester", "GB", 53.48, -2.24], ["Bradford", "GB", 53.8, -1.76],
  ["Leicester", "GB", 52.64, -1.13], ["Glasgow", "GB", 55.86, -4.25], ["Dublin", "IE", 53.35, -6.26], ["Paris", "FR", 48.86, 2.35],
  ["Marseille", "FR", 43.3, 5.37], ["Berlin", "DE", 52.52, 13.4], ["Frankfurt", "DE", 50.11, 8.68], ["Amsterdam", "NL", 52.37, 4.9],
  ["Brussels", "BE", 50.85, 4.35], ["Madrid", "ES", 40.42, -3.7], ["Rome", "IT", 41.9, 12.5], ["Stockholm", "SE", 59.33, 18.07],
  ["Oslo", "NO", 59.91, 10.75], ["Copenhagen", "DK", 55.68, 12.57], ["Sarajevo", "BA", 43.86, 18.41], ["Moscow", "RU", 55.76, 37.62],
  ["Kazan", "RU", 55.79, 49.12], ["Almaty", "KZ", 43.24, 76.89], ["Tashkent", "UZ", 41.3, 69.24],
  // Americas and Oceania
  ["New York", "US", 40.71, -74.01], ["Chicago", "US", 41.88, -87.63], ["Los Angeles", "US", 34.05, -118.24], ["Houston", "US", 29.76, -95.37],
  ["Dallas", "US", 32.78, -96.8], ["Washington, D.C.", "US", 38.91, -77.04], ["San Francisco", "US", 37.77, -122.42], ["Dearborn", "US", 42.32, -83.18],
  ["Philadelphia", "US", 39.95, -75.17], ["Atlanta", "US", 33.75, -84.39], ["Seattle", "US", 47.61, -122.33], ["Minneapolis", "US", 44.98, -93.27],
  ["Toronto", "CA", 43.65, -79.38], ["Montreal", "CA", 45.5, -73.57], ["Vancouver", "CA", 49.28, -123.12], ["Calgary", "CA", 51.05, -114.07],
  ["Ottawa", "CA", 45.42, -75.7], ["São Paulo", "BR", -23.55, -46.63], ["Buenos Aires", "AR", -34.6, -58.38], ["Mexico City", "MX", 19.43, -99.13],
  ["Sydney", "AU", -33.87, 151.21], ["Melbourne", "AU", -37.81, 144.96], ["Perth", "AU", -31.95, 115.86], ["Auckland", "NZ", -36.85, 174.76],
];

export const CITIES: City[] = RAW.map(([name, country, lat, lng]) => ({ name, country, lat, lng }));

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "");

/** Cities whose name (or country) starts with or contains the query, best matches first. */
export function searchCities(q: string, limit = 6): City[] {
  const f = fold(q.trim());
  if (!f) return [];
  const score = (c: City) => {
    const n = fold(c.name), k = fold(COUNTRIES[c.country] ?? "");
    return n === f ? 0 : n.startsWith(f) ? 1 : n.includes(f) ? 2 : k.startsWith(f) ? 3 : 9;
  };
  return CITIES.map(c => [score(c), c] as const).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0]).slice(0, limit).map(([, c]) => c);
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** The closest listed city, for naming a GPS position and guessing its country. */
export function nearestCity(p: { lat: number; lng: number }): { city: City; km: number } {
  let best = CITIES[0], km = Infinity;
  for (const c of CITIES) { const d = distanceKm(p, c); if (d < km) { km = d; best = c; } }
  return { city: best, km };
}
