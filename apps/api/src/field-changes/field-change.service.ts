import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface FieldChangeInput {
  key: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

function stringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

@Injectable()
export class FieldChangeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compare oldValue/newValue (stringified) per field and only persists the
   * fields that actually changed — never a row for a PATCH that ends up a
   * no-op. Distinct from Activity: this is the structured, per-field
   * registry for data governance, not the narrative timeline.
   */
  async recordDiff(
    organizationId: string,
    dealId: string,
    entityType: string,
    changedById: string | null,
    changes: FieldChangeInput[],
    sourceDocumentId?: string | null,
  ): Promise<void> {
    const rows = changes
      .map((c) => ({ ...c, oldValue: stringify(c.oldValue), newValue: stringify(c.newValue) }))
      .filter((c) => c.oldValue !== c.newValue)
      .map((c) => ({
        organizationId,
        dealId,
        entityType,
        fieldKey: c.key,
        fieldLabel: c.label,
        oldValue: c.oldValue,
        newValue: c.newValue,
        changedById,
        sourceDocumentId: sourceDocumentId ?? null,
      }));

    if (rows.length === 0) return;
    await this.prisma.fieldChange.createMany({ data: rows });
  }

  listForDeal(organizationId: string, dealId: string) {
    return this.prisma.fieldChange.findMany({
      where: { dealId, organizationId },
      include: {
        changedBy: { select: { id: true, firstName: true, lastName: true } },
        sourceDocument: { select: { id: true, name: true } },
      },
      orderBy: { changedAt: 'desc' },
    });
  }
}
