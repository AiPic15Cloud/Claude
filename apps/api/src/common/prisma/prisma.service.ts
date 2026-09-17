import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

// `Decimal#toJSON()` (decimal.js, used by every Prisma `Decimal` field)
// returns a STRING by default — `JSON.stringify` never throws (unlike the
// BigInt case elsewhere in this codebase), so this silently ships every
// Decimal field to the frontend as `"5.5"` instead of `5.5`. Call sites that
// defensively do `Number(x)` or `typeof x === 'string' ? Number(x) : x`
// (formatCurrency, structure-tab.tsx, …) survive it; anything that assumes
// the declared `number` TS type and calls `.toFixed()` directly on it
// crashes at runtime with "value.toFixed is not a function" — caught via
// the préqualification bilan financier tab. Fixed once, globally, instead
// of auditing every current and future Decimal-returning response.
(Prisma.Decimal.prototype as { toJSON(): unknown }).toJSON = function toJSON(this: Prisma.Decimal) {
  return this.toNumber();
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    (this as any).$on('warn', (e: any) => this.logger.warn(e.message));
    (this as any).$on('error', (e: any) => this.logger.error(e.message));
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
