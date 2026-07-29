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

      // The dataset's time axis (every period Eurostat has ever published
      // *something* for, across all series) can extend well past this
      // specific series' actual last data point — series with a long
      // compilation lag (building permits, for one) simply have no value
      // yet for the axis's most recent months. Eurostat's JSON-stat "value"
      // map is sparse (missing points are omitted entirely), so scan
      // backward from the newest period to the first one that's actually
      // present instead of assuming position 0 is populated.
      const periods = Object.entries(timeIndex).sort((a, b) => b[1] - a[1]);
      let value: number | undefined;
      let previousValue: number | undefined;
      let latestPeriod: string | undefined;
      for (let i = 0; i < periods.length; i++) {
        const [period, pos] = periods[i];
        const v = json.value[String(pos)];
        if (v === undefined) continue;
        value = v;
        latestPeriod = period;
        const [, prevPos] = periods[i + 1] ?? [];
        previousValue = prevPos !== undefined ? json.value[String(prevPos)] : undefined;
        break;
      }

      if (value === undefined) throw new Error('no data point in any available period');

      return {
        value,
        previousValue: previousValue ?? null,
        period: latestPeriod ?? null,
      };
    } catch (error) {
      this.logger.warn(`Eurostat fetch failed for ${dataset} (${new URLSearchParams(params).toString()}): ${(error as Error).message}`);
      return { value: null, previousValue: null, period: null };
    }
  }

  /**
   * The real dimension codebook for sts_cobp_m, read directly from Eurostat
   * (via logDimensionMetadata's diagnostic dump, not guessed): indic_bt is
   * BPRM_DW (permits — number of housing units) or BPRM_SQM (permits —
   * useful floor area), and cpa2_1 uses "CPA_F..." prefixed codes, e.g.
   * CPA_F41001 for residential buildings — nothing like the "PERM"/"F_CC1"
   * codes from earlier guesses, which were never valid for this dataset.
   */
  private async fetchBuildingPermits(): Promise<EurostatIndicator> {
    const attempts: Record<string, string>[] = [
      { geo: 'FR', indic_bt: 'BPRM_DW', cpa2_1: 'CPA_F41001', s_adj: 'CA', unit: 'I15', sinceTimePeriod: '2024-01' },
      { geo: 'FR', indic_bt: 'BPRM_SQM', cpa2_1: 'CPA_F41001', s_adj: 'CA', unit: 'I15', sinceTimePeriod: '2024-01' },
      { geo: 'FR', indic_bt: 'BPRM_DW', cpa2_1: 'CPA_F41001_41002', s_adj: 'CA', unit: 'I15', sinceTimePeriod: '2024-01' },
      { geo: 'FR', indic_bt: 'BPRM_DW', cpa2_1: 'CPA_F41001', s_adj: 'NSA', unit: 'I15', sinceTimePeriod: '2024-01' },
    ];

    for (const params of attempts) {
      const result = await this.fetchEurostat('sts_cobp_m', params);
      if (result.value !== null) {
        this.logger.log(`Building permits resolved with params: ${new URLSearchParams(params).toString()}`);
        return result;
      }
    }
    await this.logDimensionMetadata('sts_cobp_m', 'Building permits');
    return { value: null, previousValue: null, period: null };
  }

  /**
   * Fetches a dataset with only geo+time filtered — Eurostat still returns
   * the full dimension/category metadata for the unfiltered dimensions in
   * that response, which is exactly the codebook needed to pick correct
   * dimension values instead of guessing them. Used as a diagnostic
   * fallback when every guessed parameter combination for a dataset fails —
   * the real codes end up in the logs instead of a silent "unavailable".
   */
  private async logDimensionMetadata(dataset: string, label: string) {
    try {
      const search = new URLSearchParams({ format: 'JSON', lang: 'FR', geo: 'FR', sinceTimePeriod: '2024-01' });
      const res = await fetch(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?${search}`, {
        signal: AbortSignal.timeout(8000),
      });
      const json = (await res.json()) as { dimension?: Record<string, { category?: { index?: Record<string, number>; label?: Record<string, string> } }> };
      const dims = Object.keys(json.dimension ?? {}).filter((d) => d !== 'geo' && d !== 'time');
      const summary = dims
        .map((d) => {
          const index = json.dimension![d]?.category?.index ?? {};
          const catLabel = json.dimension![d]?.category?.label ?? {};
          const codes = Object.keys(index).map((code) => `${code}=${catLabel[code] ?? '?'}`);
          return `${d}: [${codes.join(', ')}]`;
        })
        .join(' | ');
      this.logger.warn(`${label} — ${dataset} real dimensions for geo=FR: ${summary}`);
    } catch (error) {
      this.logger.warn(`${label} dimension discovery failed: ${(error as Error).message}`);
    }
  }

  /**
   * France's official residential house price index (all dwellings),
   * Eurostat prc_hpi_q — sourced from INSEE, quarterly. Index level
   * (2015=100) and year-on-year % change are two separate unit codes on
   * the same dataset, so both are resolved independently: a wrong guess
   * on one must not take the other down.
   *
   * The exact unit/purchase codes below are a best-effort first guess —
   * this sandbox has no outbound access to verify them against the live
   * API, so a discovery dump is logged if every attempt fails, the same
   * pattern already used for building permits (see fetchBuildingPermits).
   */
  private async fetchHousePriceIndex(): Promise<EurostatIndicator> {
    const attempts: Record<string, string>[] = [
      { geo: 'FR', purchase: 'TOTAL', unit: 'INX_Q', sinceTimePeriod: '2023-01' },
      { geo: 'FR', purchase: 'TOTAL', unit: 'I15_Q', sinceTimePeriod: '2023-01' },
      { geo: 'FR', purchase: 'TOTAL', unit: 'INX', sinceTimePeriod: '2023-01' },
    ];
    for (const params of attempts) {
      const result = await this.fetchEurostat('prc_hpi_q', params);
      if (result.value !== null) {
        this.logger.log(`House price index resolved with params: ${new URLSearchParams(params).toString()}`);
        return result;
      }
    }
    await this.logDimensionMetadata('prc_hpi_q', 'House price index');
    return { value: null, previousValue: null, period: null };
  }

  private async fetchHousePriceChangeYoy(): Promise<EurostatIndicator> {
    // First deploy resolved the index level with unit=I15_Q and, from a
    // sibling dataset's dimension dump (sts_cobp_m) logged in that same run,
    // confirmed Eurostat's "% change vs same period last year" convention is
    // PCH_SM — not RCH_A4/RT4/PCH_SM4, which were the first (wrong) guesses.
    const attempts: Record<string, string>[] = [
      { geo: 'FR', purchase: 'TOTAL', unit: 'PCH_SM', sinceTimePeriod: '2023-01' },
      { geo: 'FR', purchase: 'TOTAL', unit: 'RCH_A4', sinceTimePeriod: '2023-01' },
      { geo: 'FR', purchase: 'TOTAL', unit: 'RT4', sinceTimePeriod: '2023-01' },
      { geo: 'FR', purchase: 'TOTAL', unit: 'PCH_SM4', sinceTimePeriod: '2023-01' },
    ];
    for (const params of attempts) {
      const result = await this.fetchEurostat('prc_hpi_q', params);
      if (result.value !== null) {
        this.logger.log(`House price change (y/y) resolved with params: ${new URLSearchParams(params).toString()}`);
        return result;
      }
    }
    // fetchHousePriceIndex resolved on its 2nd attempt and never triggered
    // its own dump, so the real prc_hpi_q codebook was never actually
    // logged — do it here if every guess above still fails.
    await this.logDimensionMetadata('prc_hpi_q', 'House price change (y/y)');
    return { value: null, previousValue: null, period: null };
  }

  async summary() {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.CACHE_TTL_MS) {
      return this.cache.data;
    }

    const [hicpFrance, longTermRateFrance, shortTermRateEuroArea, buildingPermitsFrance, housePriceIndex, housePriceChangeYoy] =
      await Promise.all([
        // HICP, annual rate of change, all-items, France.
        this.fetchEurostat('prc_hicp_manr', { geo: 'FR', coicop: 'CP00', sinceTimePeriod: '2024-01' }),
        // Long-term government bond yield (10y proxy), monthly, France.
        this.fetchEurostat('irt_lt_mcby_m', { geo: 'FR', sinceTimePeriod: '2024-01' }),
        // Short-term (money market / Euribor-based) interest rate, monthly, euro area.
        this.fetchEurostat('irt_st_m', { geo: 'EA', int_rt: 'IRT_M3', sinceTimePeriod: '2024-01' }),
        // Building permits, production index (2015=100), construction, France —
        // an activity index, not the raw permit count SDES publishes.
        this.fetchBuildingPermits(),
        // Residential house price index (all dwellings, 2015=100), France — quarterly, INSEE-sourced via Eurostat.
        this.fetchHousePriceIndex(),
        // Same dataset, year-on-year % change — the more directly readable of the two.
        this.fetchHousePriceChangeYoy(),
      ]);

    const data = {
      inflationHicp: hicpFrance,
      oat10y: longTermRateFrance,
      euribor3m: shortTermRateEuroArea,
      buildingPermitsIndex: buildingPermitsFrance,
      housePriceIndex,
      housePriceChangeYoy,
    };
    this.cache = { fetchedAt: Date.now(), data };
    return data;
  }
}
