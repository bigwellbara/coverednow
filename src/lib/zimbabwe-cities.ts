/** Approximate centres of Zimbabwe's towns and cities, as [latitude, longitude]. */
const CITIES: Record<string, [number, number]> = {
  harare: [-17.8292, 31.0522],
  bulawayo: [-20.1325, 28.6265],
  chitungwiza: [-18.0127, 31.0756],
  mutare: [-18.9707, 32.6709],
  gweru: [-19.45, 29.8167],
  kwekwe: [-18.9281, 29.8149],
  kadoma: [-18.3333, 29.9167],
  masvingo: [-20.0744, 30.8328],
  chinhoyi: [-17.3667, 30.2],
  marondera: [-18.1853, 31.5519],
  norton: [-17.8833, 30.7],
  chegutu: [-18.1302, 30.1407],
  bindura: [-17.3019, 31.3306],
  zvishavane: [-20.3267, 30.0665],
  "victoria falls": [-17.9318, 25.8307],
  hwange: [-18.3646, 26.4988],
  rusape: [-18.5278, 32.1284],
  chiredzi: [-21.05, 31.6667],
  beitbridge: [-22.2167, 30.0],
  kariba: [-16.5167, 28.8],
  gwanda: [-20.9333, 29.0],
  redcliff: [-19.0333, 29.7833],
  karoi: [-16.8099, 29.6925],
  shurugwi: [-19.67, 30.0],
  chipinge: [-20.1883, 32.6236],
  lupane: [-18.9315, 27.807],
  plumtree: [-20.4833, 27.8167],
};

/** Where a city is, or null for a place not in the list. Ignores case and spacing. */
export function cityPosition(city: string): [number, number] | null {
  return CITIES[city.trim().toLowerCase().replace(/\s+/g, " ")] ?? null;
}

/** The middle of Zimbabwe, and a zoom that shows the whole country. */
export const ZIMBABWE_CENTRE: [number, number] = [-19.0154, 29.1549];
