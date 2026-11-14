/**
 * Currency conversion using the free Frankfurter API (European Central Bank
 * reference rates, no key). https://frankfurter.dev
 * Rates are daily reference rates, so conversions are approximate.
 */

const FRANKFURTER_ENDPOINT = "https://api.frankfurter.dev/v1/latest";

/** Currencies Frankfurter supports (ECB reference rates). */
export const SUPPORTED_CURRENCIES: { code: string; name: string }[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Złoty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "RON", name: "Romanian Leu" },
  { code: "ISK", name: "Icelandic Króna" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "KRW", name: "South Korean Won" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "THB", name: "Thai Baht" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "ZAR", name: "South African Rand" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
];

export const SUPPORTED_CURRENCY_CODES = new Set(SUPPORTED_CURRENCIES.map((c) => c.code));

export interface FxRates {
  /** Currency the rates are quoted against (1 base = rates[X] units of X). */
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function getRates(base: string): Promise<FxRates | null> {
  if (!SUPPORTED_CURRENCY_CODES.has(base)) return null;
  try {
    const res = await fetch(`${FRANKFURTER_ENDPOINT}?base=${base}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 60 * 60 * 12 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { base: string; date: string; rates: Record<string, number> };
    return { base: data.base, date: data.date, rates: { ...data.rates, [data.base]: 1 } };
  } catch {
    return null;
  }
}

/**
 * Converts an amount into the rates' base currency.
 * Returns null when the source currency has no rate.
 */
export function convertToBase(amount: number, from: string | null, fx: FxRates | null): number | null {
  if (!from) return null;
  if (fx === null) return null;
  if (from === fx.base) return amount;
  const rate = fx.rates[from];
  if (!rate || rate <= 0) return null;
  return Math.round((amount / rate) * 100) / 100;
}
