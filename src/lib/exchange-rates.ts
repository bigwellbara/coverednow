import { z } from "zod";
import { CURRENCY_CODES, type UsdRates } from "./currencies";

// ExchangeRate-API's open endpoint: free, no key, updated once a day. Its terms
// ask for a visible credit, which the converter shows.
const SOURCE = "https://open.er-api.com/v6/latest/USD";

const responseSchema = z.object({
  result: z.literal("success"),
  time_last_update_unix: z.number(),
  rates: z.record(z.number().positive()),
});

/**
 * Today's rates against the US dollar, or null if the provider can't be reached.
 * Cached for an hour, so at most one request an hour leaves the server, and a slow
 * provider never holds a page up for more than a few seconds.
 */
export async function getUsdRates(): Promise<UsdRates | null> {
  try {
    const response = await fetch(SOURCE, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    const rates: UsdRates["rates"] = { USD: 1 };
    for (const code of CURRENCY_CODES) {
      const rate = parsed.data.rates[code];
      if (code !== "USD" && rate) rates[code] = rate;
    }
    return {
      rates,
      updatedAt: new Date(parsed.data.time_last_update_unix * 1000).toISOString(),
    };
  } catch (error) {
    console.warn("Couldn't load exchange rates", error);
    return null;
  }
}
