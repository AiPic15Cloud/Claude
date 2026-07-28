import { Injectable, Logger } from '@nestjs/common';

interface EurostatIndicator {
  value: number | null;
  previousValue: number | null;
  period: string | null;
}

interface EurostatJsonStat {
  value: Record<string, number>;
  dimension: { time: { category: { index: Record<string, number> } } };
}

/**
 * Real macro indicators from Eurostat's public REST API (no key required,
 * https://ec.europa.eu/eurostat/api/dissemination). Every call degrades
 * independently — one dataset code being stale or renamed never takes the
 * others down, and a failed indicator is surfaced as unavailable rather
 * than backfilled with a guess.
 */
@Injectable()
export class MarketIndicatorsService {
  private readonly logger = new Logger(MarketIndicatorsService.name);
  private cache: { fetchedAt: number; data: Record<string, EurostatIndicator> } | null = null;
  private readonly CACHE_TTL_MS = 60 * 60_000;

  private async fetchEurostat(dataset: string, params: Record<string, string>): Promise<EurostatIndicator> {
    const search = new URLSearchParams({ format: 'JSON', lang: 'FR', ...params });
    const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?${search.toString()}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        // Eurostat's error body is normally self-explanatory (e.g. it lists
        // the valid values for a rejected dimension) — surface it instead
        // of just the status code, so a wrong dimension code is diagnosable
        // from the logs alone rather than by guessing again blind.
        const preview = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} — ${preview.slice(0, 300)}`);
      }
      const json = (await res.json()) as EurostatJsonStat;
      const timeIndex = json.dimension?.time?.category?.index;
      if (!timeIndex) throw new Error('unexpected shape');

      const periods = Object.entries(timeIndex).sort((a, b) => b[1] - a[1]);
      const [latestPeriod, latestPos] = periods[0] ?? [];
      const [, prevPos] = periods[1] ?? [];
      const value = latestPos !== undefined ? json.value[String(latestPos)] : undefined;
      const previousValue = prevPos !== undefined ? json.value[String(prevPos)] : undefined;

      if (value === undefined) throw new Error('no data point for the latest period');

      return {
        value: value ?? null,
        previousValue: previousValue ?? null,
        period: latestPeriod ?? null,
      };
    } catch (error) {
      this.logger.warn(`Eurostat fetch failed for ${dataset} (${new URLSearchParams(params).toString()}): ${(error as Error).message}`);
      return { value: null, previousValue: null, period: null };
    }
  }

  /**
   * A first round confirmed (via a real Eurostat error, not a guess) that
   * sts_cobp_m has no "NACE_R2" dimension at all — every nace_r2-filtered
   * attempt failed with "INVALID_QUERY_DIMENSION". This round drops it and
   * pairs indic_bt with cpa2_1 (the dimension Eurostat DID accept last
   * time, just possibly with the wrong code value). If every attempt still
   * comes up empty, logDimensionMetadata() below fetches the dataset's real
   * dimension/category list directly from Eurostat so the next fix comes
   * from that data, not another guess.
   */
  private async fetchBuildingPermits(): Promise<EurostatIndicator> {
    const attempts: Record<string, string>[] = [
      { geo: 'FR', indic_bt: 'PERM', cpa2_1: 'F_CC1_1', unit: 'I15', sinceTimePeriod: '2024-01' },
      { geo: 'FR', indic_bt: 'PERM', cpa2_1: 'F_CC2', unit: 'I15', sinceTimePeriod: '2024-01' },
      { geo: 'FR', indic_bt: 'PERM', unit: 'I15', s_adj: 'CA', sinceTimePeriod: '2024-01' },
      { geo: 'FR', indic_bt: 'PSQM', unit: 'I15', s_adj: 'CA', sinceTimePeriod: '2024-01' },
    ];

    for (const params of attempts) {
      const result = await this.fetchEurostat('sts_cobp_m', params);
      if (result.value !== null) {
        this.logger.log(`Building permits resolved with params: ${new URLSearchParams(params).toString()}`);
        return result;
      }
    }
    await this.logDimensionMetadata();
    return { value: null, previousValue: null, period: null };
  }

  /**
   * Fetches sts_cobp_m with only geo+time filtered — Eurostat still returns
   * the full dimension/category metadata for the unfiltered dimensions in
   * that response, which is exactly the codebook needed to pick correct
   * indic_bt/cpa2_1 values instead of guessing them.
   */
  private async logDimensionMetadata() {
    try {
      const search = new URLSearchParams({ format: 'JSON', lang: 'FR', geo: 'FR', sinceTimePeriod: '2024-01' });
      const res = await fetch(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_cobp_m?${search}`, {
        signal: AbortSignal.timeout(8000),
      });
      const json = (await res.json()) as { dimension?: Record<string, { category?: { index?: Record<string, number>; label?: Record<string, string> } }> };
      const dims = Object.keys(json.dimension ?? {}).filter((d) => d !== 'geo' && d !== 'time');
      const summary = dims
        .map((d) => {
          const index = json.dimension![d]?.category?.index ?? {};
          const label = json.dimension![d]?.category?.label ?? {};
          const codes = Object.keys(index).map((code) => `${code}=${label[code] ?? '?'}`);
          return `${d}: [${codes.join(', ')}]`;
        })
        .join(' | ');
      this.logger.warn(`Building permits — sts_cobp_m real dimensions for geo=FR: ${summary}`);
    } catch (error) {
      this.logger.warn(`Building permits dimension discovery failed: ${(error as Error).message}`);
    }
  }

  async summary() {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.CACHE_TTL_MS) {
      return this.cache.data;
    }

    const [hicpFrance, longTermRateFrance, shortTermRateEuroArea, buildingPermitsFrance] = await Promise.all([
      // HICP, annual rate of change, all-items, France.
      this.fetchEurostat('prc_hicp_manr', { geo: 'FR', coicop: 'CP00', sinceTimePeriod: '2024-01' }),
      // Long-term government bond yield (10y proxy), monthly, France.
      this.fetchEurostat('irt_lt_mcby_m', { geo: 'FR', sinceTimePeriod: '2024-01' }),
      // Short-term (money market / Euribor-based) interest rate, monthly, euro area.
      this.fetchEurostat('irt_st_m', { geo: 'EA', int_rt: 'IRT_M3', sinceTimePeriod: '2024-01' }),
      // Building permits, production index (2015=100), construction, France —
      // an activity index, not the raw permit count SDES publishes.
      this.fetchBuildingPermits(),
    ]);

    const data = {
      inflationHicp: hicpFrance,
      oat10y: longTermRateFrance,
      euribor3m: shortTermRateEuroArea,
      buildingPermitsIndex: buildingPermitsFrance,
    };
    this.cache = { fetchedAt: Date.now(), data };
    return data;
  }
}
