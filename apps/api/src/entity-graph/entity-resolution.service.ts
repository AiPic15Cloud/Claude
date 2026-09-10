import { Injectable, Logger } from '@nestjs/common';
import { nanoid } from 'nanoid';
import type { Entity, EntityDomain, EntityType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { searchCompanyByName } from '../common/siren/siren-resolver.util';
import { EntityMirrorService } from './entity-mirror.service';

export type ResolutionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface ResolveCompanyInput {
  name: string;
  siren?: string;
  type: EntityType;
  domain?: EntityDomain;
  /** Traçabilité de la source (ex. "market-observation:clubfunding", "deal:porteur") — jamais anonyme (doctrine §0.2). */
  source: string;
  /** Crée une nouvelle entité quand aucune correspondance n'est trouvée et qu'aucun SIREN n'est fourni. Par défaut false : ne jamais fabriquer une entité sur un simple nom non confirmé sans décision explicite de l'appelant. */
  createIfNoMatch?: boolean;
}

export interface ResolveCompanyResult {
  entity: Entity | null;
  created: boolean;
  confidence: ResolutionConfidence;
  /** Peuplé uniquement quand `entity` est null faute de correspondance unique — jamais fusionné automatiquement (spec V2 §7.1 "conserver les candidats ambigus sans fusion"). */
  candidates: { id: string; name: string }[];
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Entity Resolution Engine (spec Market Relationship & Contagion
 * Intelligence V2, §7.1) — "la brique prioritaire" : transforme une identité
 * brute (nom scrapé, SIREN si disponible) en Entity canonique du Knowledge
 * Graph v2. Le SIREN prime toujours comme identifiant (EntityIdentifier,
 * déjà présent au schéma mais jusqu'ici jamais peuplé par aucun service) ;
 * à défaut, une correspondance par nom normalisé n'est acceptée que si elle
 * est unique — sinon les candidats sont rendus sans fusion, conformément à
 * la doctrine "aucune relation créée sur la seule similarité d'un nom".
 */
@Injectable()
export class EntityResolutionService {
  private readonly logger = new Logger(EntityResolutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityMirror: EntityMirrorService,
  ) {}

  async resolveCompany(organizationId: string, input: ResolveCompanyInput): Promise<ResolveCompanyResult> {
    const siren = input.siren;
    if (siren) return this.resolveBySiren(organizationId, input, siren);
    return this.resolveByName(organizationId, input);
  }

  private async resolveBySiren(organizationId: string, input: ResolveCompanyInput, siren: string): Promise<ResolveCompanyResult> {
    const existingIdentifier = await this.prisma.entityIdentifier.findFirst({
      where: { type: 'SIREN', value: siren, entity: { organizationId } },
      include: { entity: true },
    });
    if (existingIdentifier) {
      await this.recordAliasIfNew(existingIdentifier.entity.id, input.name, input.source);
      return { entity: existingIdentifier.entity, created: false, confidence: 'HIGH', candidates: [] };
    }

    // Pas encore d'identifiant SIREN en base pour ce numéro — vérifie s'il
    // existe déjà une entité du même nom sans SIREN attaché (résolution
    // antérieure faible) avant de créer un doublon : "réévaluer une
    // résolution lorsqu'une nouvelle source apporte un identifiant plus fort"
    // (spec V2 §7.1).
    const byName = await this.findByNormalizedName(organizationId, input.name);
    if (byName.length === 1) {
      await this.prisma.entityIdentifier.create({
        data: { entityId: byName[0].id, type: 'SIREN', value: siren, verifiedAt: new Date() },
      });
      await this.recordAliasIfNew(byName[0].id, input.name, input.source);
      this.logger.log(`SIREN ${siren} rattaché à l'entité existante ${byName[0].id} (résolution renforcée).`);
      return { entity: byName[0], created: false, confidence: 'HIGH', candidates: [] };
    }
    if (byName.length > 1) {
      // Ambigu même avec un SIREN en main — ne devine pas laquelle des
      // entités homonymes est la bonne, laisse l'analyste trancher.
      return { entity: null, created: false, confidence: 'LOW', candidates: byName.map((e) => ({ id: e.id, name: e.name })) };
    }

    const entity = await this.createEntity(organizationId, input);
    await this.prisma.entityIdentifier.create({ data: { entityId: entity.id, type: 'SIREN', value: siren, verifiedAt: new Date() } });
    return { entity, created: true, confidence: 'HIGH', candidates: [] };
  }

  private async resolveByName(organizationId: string, input: ResolveCompanyInput): Promise<ResolveCompanyResult> {
    const matches = await this.findByNormalizedName(organizationId, input.name);
    if (matches.length === 1) {
      await this.recordAliasIfNew(matches[0].id, input.name, input.source);
      return { entity: matches[0], created: false, confidence: 'MEDIUM', candidates: [] };
    }
    if (matches.length > 1) {
      return { entity: null, created: false, confidence: 'LOW', candidates: matches.map((e) => ({ id: e.id, name: e.name })) };
    }

    if (!input.createIfNoMatch) {
      return { entity: null, created: false, confidence: 'NONE', candidates: [] };
    }
    const entity = await this.createEntity(organizationId, input);
    return { entity, created: true, confidence: 'LOW', candidates: [] };
  }

  /** Recherche externe (recherche-entreprises.api.gouv.fr) par dénomination — n'écrit rien, propose des candidats SIREN à confirmer avant tout resolveCompany({siren}). */
  async searchExternalCandidates(name: string, city?: string) {
    return searchCompanyByName(name, city);
  }

  private async findByNormalizedName(organizationId: string, name: string): Promise<Entity[]> {
    const target = normalizeName(name);
    // Pas d'expression normalisée en base (pas de colonne générée) — filtre
    // applicatif sur un ensemble déjà borné par organisation ; acceptable
    // tant que le graphe reste de taille portefeuille, à revoir si le volume
    // d'entités croît significativement (index trigram Postgres, par ex.).
    const candidates = await this.prisma.entity.findMany({
      where: { organizationId, OR: [{ name: { contains: name, mode: 'insensitive' } }, { aliases: { some: { alias: { contains: name, mode: 'insensitive' } } } }] },
    });
    return candidates.filter((e) => normalizeName(e.name) === target);
  }

  private async recordAliasIfNew(entityId: string, name: string, source: string): Promise<void> {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId }, select: { name: true } });
    if (!entity || normalizeName(entity.name) === normalizeName(name)) return;
    const existingAlias = await this.prisma.entityAlias.findFirst({ where: { entityId, alias: name } });
    if (existingAlias) return;
    await this.prisma.entityAlias.create({ data: { entityId, alias: name, source } });
  }

  private async createEntity(organizationId: string, input: ResolveCompanyInput): Promise<Entity> {
    const entity = await this.prisma.entity.create({
      data: {
        id: nanoid(),
        organizationId,
        type: input.type,
        domain: input.domain ?? 'PORTFOLIO',
        name: input.name,
        coverage: 'UNKNOWN',
      },
    });
    // Sans ce miroir, cette entité resterait injoignable depuis
    // DealEntityLink (toujours branché sur GraphEntity v1) — voir le
    // commentaire de EntityMirrorService.createEntityGraphMirror.
    await this.entityMirror.createEntityGraphMirror(organizationId, entity);
    return entity;
  }
}
