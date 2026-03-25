/**
 * Halo Internal Free API Utilities
 *
 * Integrates free public APIs and built-in platform capabilities:
 * - OpenFDA Drug API  (drug lookup, recall search — no key required)
 * - Open Exchange Rates API  (live currency rates — no key required)
 * - REST Countries API  (country data — no key required)
 * - Intl formatting  (currency, compact numbers, relative time)
 * - Crypto-safe ID generation  (crypto.randomUUID / getRandomValues)
 * - Network & clipboard utilities
 */

import { Platform } from 'react-native';

// ─── In-Memory Cache ─────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expires: number }>();

function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data as T);
  return fetcher().then((data) => {
    cache.set(key, { data, expires: Date.now() + ttlMs });
    return data;
  });
}

export function clearApiCache(): void {
  cache.clear();
}

// ─── OpenFDA Drug API ────────────────────────────────────────────────
// Free, public, no API key.  https://open.fda.gov/apis/

export interface FdaDrug {
  brand_name: string;
  generic_name: string;
  manufacturer_name: string;
  product_ndc: string;
  product_type: string;
  route: string;
  dosage_form: string;
}

export async function searchFdaDrugs(
  query: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<FdaDrug[]> {
  if (!query || query.length < 2) return [];
  const q = encodeURIComponent(query);
  const url = `https://api.fda.gov/drug/ndc.json?search=brand_name:"${q}"+generic_name:"${q}"&limit=${limit}`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []).map((r: Record<string, unknown>) => ({
      brand_name: (r.brand_name as string) ?? '',
      generic_name: (r.generic_name as string) ?? '',
      manufacturer_name:
        ((r.openfda as Record<string, unknown[]> | undefined)?.manufacturer_name?.[0] as string) ??
        (r.labeler_name as string) ??
        '',
      product_ndc: (r.product_ndc as string) ?? '',
      product_type: (r.product_type as string) ?? '',
      route: Array.isArray(r.route) ? r.route.join(', ') : ((r.route as string) ?? ''),
      dosage_form: (r.dosage_form as string) ?? '',
    }));
  } catch {
    return [];
  }
}

export interface FdaRecall {
  recall_number: string;
  reason_for_recall: string;
  status: string;
  classification: string;
  product_description: string;
  recalling_firm: string;
  voluntary_mandated: string;
}

export async function searchFdaRecalls(
  query: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<FdaRecall[]> {
  if (!query || query.length < 2) return [];
  const q = encodeURIComponent(query);
  const url = `https://api.fda.gov/drug/enforcement.json?search=product_description:"${q}"&limit=${limit}`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []).map((r: Record<string, unknown>) => ({
      recall_number: (r.recall_number as string) ?? '',
      reason_for_recall: (r.reason_for_recall as string) ?? '',
      status: (r.status as string) ?? '',
      classification: (r.classification as string) ?? '',
      product_description: (r.product_description as string) ?? '',
      recalling_firm: (r.recalling_firm as string) ?? '',
      voluntary_mandated: (r.voluntary_mandated as string) ?? '',
    }));
  } catch {
    return [];
  }
}

// ─── Exchange Rate API ───────────────────────────────────────────────
// Free, no API key.  https://open.er-api.com

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
}

export function getExchangeRates(base = 'USD'): Promise<ExchangeRates> {
  return cached(`rates-${base}`, 3_600_000, async () => {
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
      if (!res.ok) return { base, rates: {} };
      const json = await res.json();
      return {
        base: (json.base_code as string) ?? base,
        rates: (json.rates as Record<string, number>) ?? {},
      };
    } catch {
      return { base, rates: {} };
    }
  });
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return amount;
  const { rates } = await getExchangeRates(from);
  const rate = rates[to];
  return rate ? +(amount * rate).toFixed(2) : amount;
}

// ─── REST Countries API ──────────────────────────────────────────────
// Free, no API key.  https://restcountries.com

export interface CountryInfo {
  name: string;
  code: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  region: string;
  callingCode: string;
}

export function getCountries(): Promise<CountryInfo[]> {
  return cached('countries', 86_400_000, async () => {
    try {
      const res = await fetch(
        'https://restcountries.com/v3.1/all?fields=name,cca2,flag,currencies,region,idd',
      );
      if (!res.ok) return [];
      const json: Record<string, unknown>[] = await res.json();
      return json
        .map((c) => {
          const currencies = (c.currencies ?? {}) as Record<string, { symbol?: string }>;
          const curr = Object.entries(currencies)[0];
          const idd = c.idd as { root?: string; suffixes?: string[] } | undefined;
          return {
            name: ((c.name as { common?: string })?.common as string) ?? '',
            code: (c.cca2 as string) ?? '',
            flag: (c.flag as string) ?? '',
            currency: curr?.[0] ?? '',
            currencySymbol: curr?.[1]?.symbol ?? '',
            region: (c.region as string) ?? '',
            callingCode: (idd?.root ?? '') + (idd?.suffixes?.[0] ?? ''),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  });
}

// ─── Intl Formatting (built-in, zero-cost) ───────────────────────────

const currencyFmtCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  const decimals = amount % 1 === 0 ? 0 : 2;
  const key = `${currency}-${locale}-${decimals}`;
  let fmt = currencyFmtCache.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: 2,
      });
    } catch {
      fmt = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: decimals,
        maximumFractionDigits: 2,
      });
    }
    currencyFmtCache.set(key, fmt);
  }
  return fmt.format(amount);
}

export function formatUnitCount(amount: number): string {
  return `${amount.toLocaleString('en-US')} units`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

const currencyFieldPattern = /cost|price|amount|value|revenue|fee|rate|premium|payment|invoice|balance|budget|income|salary|wage|total.*\$/i;

export function isCurrencyFieldName(key: string): boolean {
  return currencyFieldPattern.test(key);
}

export function formatCompactNumber(n: number, locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return n.toLocaleString(locale);
  }
}

const rtf =
  typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat !== 'undefined'
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null;

export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const diffMs = d.getTime() - Date.now();
  const absDiff = Math.abs(diffMs);

  if (!rtf) {
    const mins = Math.round(absDiff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  const seconds = diffMs / 1000;
  if (absDiff < 60_000) return rtf.format(Math.round(seconds), 'second');
  const minutes = seconds / 60;
  if (absDiff < 3_600_000) return rtf.format(Math.round(minutes), 'minute');
  const hours = minutes / 60;
  if (absDiff < 86_400_000) return rtf.format(Math.round(hours), 'hour');
  const days = hours / 24;
  if (absDiff < 2_592_000_000) return rtf.format(Math.round(days), 'day');
  const months = days / 30;
  if (absDiff < 31_536_000_000) return rtf.format(Math.round(months), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}

// ─── ID Generation (crypto-safe) ─────────────────────────────────────

export function generateId(prefix = ''): string {
  let id: string;
  if (
    Platform.OS === 'web' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    id = crypto.randomUUID();
  } else {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    id = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }
  return prefix ? `${prefix}-${id}` : id;
}

// ─── Network Status ──────────────────────────────────────────────────

export function isOnline(): boolean {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    return navigator.onLine !== false;
  }
  return true;
}

// ─── Clipboard ───────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  if (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    navigator.clipboard
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
