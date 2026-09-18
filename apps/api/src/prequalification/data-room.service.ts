import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { suggestDataRoomBlocks, type DataRoomSuggestion } from './prequal-data-room.util';

const num = (value: { toNumber(): number } | null | undefined): number | null => (value != null ? Number(value) : null);

/**
 * Data room dynamique (spec §14) — recommande les blocs conditionnels
 * pertinents à partir des données déjà saisies au dossier (voir doctrine
 * dans prequal-data-room.util.ts), puis retire tout bloc pour lequel une
 * `PrequalDocumentRequest` existe déjà (jamais suggéré deux fois). Réutilise
 * la même requête que ExposureService pour compter les financements externes
 * confirmés — pas de duplication de modèle, juste de la lecture.
 */
@Injectable()
export class DataRoomService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuggestions(organizationId: string, caseId: string): Promise<DataRoomSuggestion[]> {
    const prequalCase = await this.prisma.prequalificationCase.findFirst({
      where: { id: caseId, organizationId },
      include: { project: true, financial: true, companies: true, people: true, requests: true },
    });
    if (!prequalCase) throw new NotFoundException('Dossier de préqualification introuvable.');

    const salesLotsCount = await this.prisma.prequalSalesLot.count({ where: { prequalificationCaseId: caseId } });

    const entityIds = [...prequalCase.people.map((p) => p.entityId), ...prequalCase.companies.map((c) => c.entityId)].filter(
      (id): id is string => Boolean(id),
    );
    const externalFinancingsCount =
      entityIds.length > 0
        ? await this.prisma.projectObservationEntityLink.count({ where: { organizationId, entityId: { in: entityIds }, status: 'CONFIRMED' } })
        : 0;

    const suggestions = suggestDataRoomBlocks({
      worksDescription: prequalCase.project?.worksDescription ?? null,
      createdSurfaceSqm: num(prequalCase.project?.createdSurfaceSqm),
      projectType: prequalCase.projectType,
      lotCount: prequalCase.project?.lotCount ?? null,
      acquisitionStatus: prequalCase.project?.acquisitionStatus ?? null,
      salesLotsCount,
      interimRevenueNote: prequalCase.project?.interimRevenueNote ?? null,
      otherRevenueRetained: num(prequalCase.financial?.otherRevenueRetained),
      externalFinancingsCount,
    });

    const coveredBlocks = new Set(prequalCase.requests.map((r) => r.block));
    return suggestions.filter((s) => !coveredBlocks.has(s.block));
  }
}
