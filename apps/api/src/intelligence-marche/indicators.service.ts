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
  private rateHistoryCache: {
    fetchedAt: number;
    data: { oat10y: { period: string; value: number }[]; ecbPolicyRate: { period: string; value: number }[]; mortgageRate: { period: string; value: number }[] };
  } | null = null;
  private buildingPermitsHistoryCache: { fetchedAt: number; data: { period: string; value: number }[] } | null = null;
  private housePriceIndexHistoryCache: { fetchedAt: number; data: { period: string; value: number }[] } | null = null;
  private constructionCostIndexHistoryCache: { fetchedAt: number; data: { period: string; value: number }[] } | null = null;
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

  /** Same Eurostat call as fetchEurostat, but returns every period present instead of only the latest two — used for history charts. */
  private async fetchEurostatSeries(dataset: string, params: Record<string, string>): Promise<{ period: string; value: number }[]> {
    const search = new URLSearchParams({ format: 'JSON', lang: 'FR', ...params });
    const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?${search.toString()}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        const preview = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} — ${preview.slice(0, 300)}`);
      }
      const json = (await res.json()) as EurostatJsonStat;
      const timeIndex = json.dimension?.time?.category?.index;
      if (!timeIndex) throw new Error('unexpected shape');

      return Object.entries(timeIndex)
        .sort((a, b) => a[1] - b[1])
        .map(([period, pos]) => ({ period, value: json.value[String(pos)] }))
        .filter((point): point is { period: string; value: number } => point.value !== undefined);
    } catch (error) {
      this.logger.warn(`Eurostat series fetch failed for ${dataset} (${new URLSearchParams(params).toString()}): ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Shared fetcher for ECB Data Portal series (data-api.ecb.europa.eu, free,
   * no key) — used for both the ECB policy rate and the French mortgage
   * rate below, which are the same SDMX-JSON shape on two different
   * dataflows/keys. Observations are collapsed to one point per month (last
   * value of the month) so a daily series (the policy rate, a step function
   * that only moves on Governing Council decisions) lines up with an
   * already-monthly one (the mortgage rate) on the same chart — a no-op for
   * series that are monthly to begin with.
   *
   * This sandbox has no outbound network access to verify the exact SDMX-JSON
   * shape against the live API — if the assumed structure is wrong, a raw
   * response dump is logged so the real shape is recoverable from Railway's
   * logs, same defensive pattern as logDimensionMetadata() below.
   */
  private async fetchEcbSeries(flowRef: string, key: string, sinceIso: string, label: string): Promise<{ period: string; value: number }[]> {
    const url = `https://data-api.ecb.europa.eu/service/data/${flowRef}/${key}?format=jsondata&startPeriod=${sinceIso}&detail=dataonly`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        const preview = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} — ${preview.slice(0, 300)}`);
      }
      const json = (await res.json()) as {
        dataSets?: { series?: Record<string, { observations?: Record<string, number[]> }> }[];
        structure?: { dimensions?: { observation?: { values?: { id: string }[] }[] } };
      };
      const seriesMap = json.dataSets?.[0]?.series;
      const firstKey = seriesMap ? Object.keys(seriesMap)[0] : undefined;
      const observations = firstKey ? seriesMap![firstKey].observations : undefined;
      const timeValues = json.structure?.dimensions?.observation?.[0]?.values;
      if (!observations || !timeValues) throw new Error('unexpected SDMX-JSON shape');

      const byMonth = new Map<string, number>();
      for (const [idx, obs] of Object.entries(observations)) {
        const date = timeValues[Number(idx)]?.id;
        const value = obs?.[0];
        if (!date || value === undefined) continue;
        byMonth.set(date.slice(0, 7), value);
      }
      return Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, value]) => ({ period, value }));
    } catch (error) {
      this.logger.warn(`${label} fetch failed: ${(error as Error).message}`);
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        this.logger.warn(`${label} raw response (first 500 chars): ${(await res.text()).slice(0, 500)}`);
      } catch {
        /* best-effort diagnostic only */
      }
      return [];
    }
  }

  /** ECB's official main refinancing rate ("taux directeur") — the rate French financial press actually means by that term. */
  private fetchEcbPolicyRateHistory(sinceIso: string) {
    return this.fetchEcbSeries('FM', 'D.U2.EUR.4F.KR.MRR_FR.LEV', sinceIso, 'ECB policy rate history');
  }

  /**
   * INSEE's free BDM (Banque de Données Macroéconomiques) series API —
   * SDMX-JSON like the ECB Data Portal, so the same parsing shape applies,
   * just a different URL scheme (idBank instead of flowRef+key). Publicly
   * documented as accessible without an API key for basic series lookups,
   * unlike the Banque de France Webstat portal (ruled out earlier — that one
   * does require a registered account).
   *
   * This sandbox has no outbound network access to verify this against the
   * live API — if INSEE's endpoint actually does require auth (their newer
   * portail-api.insee.fr has been moving other services that way), the raw
   * response is logged so that's recoverable from Railway's logs rather than
   * failing silently.
   */
  private async fetchInseeSeries(idBank: string, sinceIso: string, label: string): Promise<{ period: string; value: number }[]> {
    const url = `https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/${idBank}?startPeriod=${sinceIso}`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        const preview = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} — ${preview.slice(0, 300)}`);
      }
      const json = (await res.json()) as {
        dataSets?: { series?: Record<string, { observations?: Record<string, number[]> }> }[];
        structure?: { dimensions?: { observation?: { values?: { id: string }[] }[] } };
      };
      const seriesMap = json.dataSets?.[0]?.series;
      const firstKey = seriesMap ? Object.keys(seriesMap)[0] : undefined;
      const observations = firstKey ? seriesMap![firstKey].observations : undefined;
      const timeValues = json.structure?.dimensions?.observation?.[0]?.values;
      if (!observations || !timeValues) throw new Error('unexpected SDMX-JSON shape');

      const points: { period: string; value: number }[] = [];
      for (const [idx, obs] of Object.entries(observations)) {
        const period = timeValues[Number(idx)]?.id;
        const value = obs?.[0];
        if (!period || value === undefined) continue;
        points.push({ period, value });
      }
      return points.sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      this.logger.warn(`${label} fetch failed: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * BT01 — indice national du Bâtiment tous corps d'état (INSEE, base 2010),
   * utilisé pour les clauses de révision de prix des marchés de travaux.
   * idBank 001710986, identifié via insee.fr/fr/statistiques/serie/001710986.
   */
  private fetchBt01History(sinceIso: string) {
    return this.fetchInseeSeries('001710986', sinceIso, 'BT01 (indice construction) history');
  }

  private async fetchBt01(): Promise<EurostatIndicator> {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const points = await this.fetchBt01History(since.toISOString().slice(0, 10));
    if (points.length === 0) return { value: null, previousValue: null, period: null };
    const latest = points[points.length - 1];
    const previous = points[points.length - 2];
    return { value: latest.value, previousValue: previous?.value ?? null, period: latest.period };
  }

  async constructionCostIndexHistory(): Promise<{ period: string; value: number }[]> {
    if (this.constructionCostIndexHistoryCache && Date.now() - this.constructionCostIndexHistoryCache.fetchedAt < this.CACHE_TTL_MS) {
      return this.constructionCostIndexHistoryCache.data;
    }
    const since = new Date();
    since.setFullYear(since.getFullYear() - 5);
    const points = await this.fetchBt01History(since.toISOString().slice(0, 10));
    this.constructionCostIndexHistoryCache = { fetchedAt: Date.now(), data: points };
    return points;
  }

  /**
   * Average annualised agreed rate on new house-purchase loans to French
   * households, all maturities — the actual "taux moyen des prêts
   * immobiliers" headline figure. ECB Data Portal, dataflow MIR (MFI
   * interest rate statistics), key M.FR.B.A2C.A.R.A.2250.EUR.N: monthly,
   * France, new business, loans for house purchase, all maturities,
   * annualised agreed rate, not seasonally adjusted.
   */
  private fetchFrenchMortgageRateHistory(sinceIso: string) {
    return this.fetchEcbSeries('MIR', 'M.FR.B.A2C.A.R.A.2250.EUR.N', sinceIso, 'French mortgage rate history');
  }

  /** Latest-two-points snapshot of the mortgage rate history, for the indicator tile — same series as fetchFrenchMortgageRateHistory. */
  private async fetchFrenchMortgageRate(): Promise<EurostatIndicator> {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const points = await this.fetchFrenchMortgageRateHistory(since.toISOString().slice(0, 10));
    if (points.length === 0) return { value: null, previousValue: null, period: null };
    const latest = points[points.length - 1];
    const previous = points[points.length - 2];
    return { value: latest.value, previousValue: previous?.value ?? null, period: latest.period };
  }

  async rateHistory() {
    if (this.rateHistoryCache && Date.now() - this.rateHistoryCache.fetchedAt < this.CACHE_TTL_MS) {
      return this.rateHistoryCache.data;
    }

    const since = new Date();
    since.setMonth(since.getMonth() - 24);
    const sinceMonth = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}`;
    const sinceIso = since.toISOString().slice(0, 10);

    const [oat10y, ecbPolicyRate, mortgageRate] = await Promise.all([
      this.fetchEurostatSeries('irt_lt_mcby_m', { geo: 'FR', sinceTimePeriod: sinceMonth }),
      this.fetchEcbPolicyRateHistory(sinceIso),
      this.fetchFrenchMortgageRateHistory(sinceIso),
    ]);

    const data = { oat10y, ecbPolicyRate, mortgageRate };
    this.rateHistoryCache = { fetchedAt: Date.now(), data };
    return data;
  }

  /**
   * The real dimension codebook for sts_cobp_m, read directly from Eurostat
   * (via logDimensionMetadata's diagnostic dump in the production logs, not
   * guessed): indic_bt is BPRM_DW (permits — number of housing units) or
   * BPRM_SQM (permits — useful floor area), cpa2_1 uses "CPA_F..." prefixed
   * codes, e.g. CPA_F41001 for residential buildings, and — the actual bug
   * that kept every attempt failing — s_adj only has two valid values, NSA
   * (raw) and SCA (seasonally + calendar adjusted); the earlier guess of
   * 'CA' doesn't exist in this dataset at all.
   */
  // I15 (2015=100) never returned a single data point since 2024 across
  // every valid indic_bt/cpa2_1/s_adj combo — the dimension is real but the
  // base year looks discontinued for recent periods. Eurostat's STS indices
  // get periodically rebased; I21 (2021=100, also a confirmed-real unit
  // code in this dataset — and the one that actually resolved in
  // production) is tried first for that reason, I15 kept as a fallback.
  // Shared between the latest-value snapshot and the multi-year history —
  // sinceTimePeriod is added per call site since the two want different
  // windows.
  private readonly BUILDING_PERMITS_ATTEMPTS: Record<string, string>[] = [
    { geo: 'FR', indic_bt: 'BPRM_DW', cpa2_1: 'CPA_F41001', s_adj: 'SCA', unit: 'I21' },
    { geo: 'FR', indic_bt: 'BPRM_DW', cpa2_1: 'CPA_F41001', s_adj: 'NSA', unit: 'I21' },
    { geo: 'FR', indic_bt: 'BPRM_DW', cpa2_1: 'CPA_F41001_41002', s_adj: 'SCA', unit: 'I21' },
    { geo: 'FR', indic_bt: 'BPRM_SQM', cpa2_1: 'CPA_F41001', s_adj: 'SCA', unit: 'I21' },
    { geo: 'FR', indic_bt: 'BPRM_DW', cpa2_1: 'CPA_F41001', s_adj: 'SCA', unit: 'I15' },
    { geo: 'FR', indic_bt: 'BPRM_DW', cpa2_1: 'CPA_F41001', s_adj: 'NSA', unit: 'I15' },
  ];

  private async fetchBuildingPermits(): Promise<EurostatIndicator> {
    for (const params of this.BUILDING_PERMITS_ATTEMPTS) {
      const result = await this.fetchEurostat('sts_cobp_m', { ...params, sinceTimePeriod: '2024-01' });
      if (result.value !== null) {
        this.logger.log(`Building permits resolved with params: ${new URLSearchParams(params).toString()}`);
        return result;
      }
    }
    await this.logDimensionMetadata('sts_cobp_m', 'Building permits');
    return { value: null, previousValue: null, period: null };
  }

  /** Multi-year monthly history for the trend chart — same resolution strategy as fetchBuildingPermits(), just over a longer window. */
  async buildingPermitsHistory(): Promise<{ period: string; value: number }[]> {
    if (this.buildingPermitsHistoryCache && Date.now() - this.buildingPermitsHistoryCache.fetchedAt < this.CACHE_TTL_MS) {
      return this.buildingPermitsHistoryCache.data;
    }

    const since = new Date();
    since.setFullYear(since.getFullYear() - 5);
    const sinceMonth = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}`;

    let points: { period: string; value: number }[] = [];
    for (const params of this.BUILDING_PERMITS_ATTEMPTS) {
      points = await this.fetchEurostatSeries('sts_cobp_m', { ...params, sinceTimePeriod: sinceMonth });
      if (points.length > 0) break;
    }

    this.buildingPermitsHistoryCache = { fetchedAt: Date.now(), data: points };
    return points;
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
  // I15_Q (index level, 2015=100) is the confirmed-working unit — discovered
  // via logDimensionMetadata's production dump, same as building permits'
  // I21/I15 split. INX_Q/INX kept as earlier guesses ahead of it in case
  // Eurostat ever rebases the series (mirrors the building-permits pattern).
  private readonly HOUSE_PRICE_INDEX_ATTEMPTS: Record<string, string>[] = [
    { geo: 'FR', purchase: 'TOTAL', unit: 'INX_Q' },
    { geo: 'FR', purchase: 'TOTAL', unit: 'I15_Q' },
    { geo: 'FR', purchase: 'TOTAL', unit: 'INX' },
  ];

  private async fetchHousePriceIndex(): Promise<EurostatIndicator> {
    for (const params of this.HOUSE_PRICE_INDEX_ATTEMPTS) {
      const result = await this.fetchEurostat('prc_hpi_q', { ...params, sinceTimePeriod: '2023-01' });
      if (result.value !== null) {
        this.logger.log(`House price index resolved with params: ${new URLSearchParams(params).toString()}`);
        return result;
      }
    }
    await this.logDimensionMetadata('prc_hpi_q', 'House price index');
    return { value: null, previousValue: null, period: null };
  }

  /** Multi-year quarterly history for the trend chart — same resolution strategy as fetchHousePriceIndex(), just over a longer window. */
  async housePriceIndexHistory(): Promise<{ period: string; value: number }[]> {
    if (this.housePriceIndexHistoryCache && Date.now() - this.housePriceIndexHistoryCache.fetchedAt < this.CACHE_TTL_MS) {
      return this.housePriceIndexHistoryCache.data;
    }

    const since = new Date();
    since.setFullYear(since.getFullYear() - 8);
    const sinceQuarter = `${since.getFullYear()}-Q${Math.floor(since.getMonth() / 3) + 1}`;

    let points: { period: string; value: number }[] = [];
    for (const params of this.HOUSE_PRICE_INDEX_ATTEMPTS) {
      points = await this.fetchEurostatSeries('prc_hpi_q', { ...params, sinceTimePeriod: sinceQuarter });
      if (points.length > 0) break;
    }

    this.housePriceIndexHistoryCache = { fetchedAt: Date.now(), data: points };
    return points;
  }

  private async fetchHousePriceChangeYoy(): Promise<EurostatIndicator> {
    // prc_hpi_q's real "unit" codebook (from logDimensionMetadata's dump in
    // the production logs): I15_Q/I25_Q are index levels, and the only two
    // rate-of-change codes are RCH_Q (quarter-on-quarter) and RCH_A
    // (year-on-year, which is what this method wants) — PCH_SM/RCH_A4/RT4/
    // PCH_SM4 (the earlier guesses) were never valid values for this dataset.
    const attempts: Record<string, string>[] = [{ geo: 'FR', purchase: 'TOTAL', unit: 'RCH_A', sinceTimePeriod: '2023-01' }];
    for (const params of attempts) {
      const result = await this.fetchEurostat('prc_hpi_q', params);
      if (result.value !== null) {
        this.logger.log(`House price change (y/y) resolved with params: ${new URLSearchParams(params).toString()}`);
        return result;
      }
    }
    await this.logDimensionMetadata('prc_hpi_q', 'House price change (y/y)');
    return { value: null, previousValue: null, period: null };
  }

  async summary() {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.CACHE_TTL_MS) {
      return this.cache.data;
    }

    const [
      hicpFrance,
      longTermRateFrance,
      shortTermRateEuroArea,
      buildingPermitsFrance,
      housePriceIndex,
      housePriceChangeYoy,
      mortgageRate,
      constructionCostIndex,
    ] = await Promise.all([
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
        // Average rate on new home loans to households, France — the actual "taux moyen des prêts immobiliers".
        this.fetchFrenchMortgageRate(),
        // BT01 — indice national du Bâtiment (INSEE), pour les clauses de révision de prix des marchés de travaux.
        this.fetchBt01(),
      ]);

    const data = {
      inflationHicp: hicpFrance,
      oat10y: longTermRateFrance,
      euribor3m: shortTermRateEuroArea,
      buildingPermitsIndex: buildingPermitsFrance,
      housePriceIndex,
      housePriceChangeYoy,
      mortgageRate,
      constructionCostIndex,
    };
    this.cache = { fetchedAt: Date.now(), data };
    return data;
  }
}
