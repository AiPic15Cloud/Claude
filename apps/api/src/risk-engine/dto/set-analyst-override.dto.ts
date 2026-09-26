import { ApiProperty } from '@nestjs/swagger';
import { DealSurveillanceStatus } from '@prisma/client';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Sous-ensemble actuellement valide de DealSurveillanceStatus — l'enum
 * Prisma conserve OUTPERFORMING/RECOVERY uniquement pour pouvoir
 * désérialiser d'anciennes lignes d'historique (RiskScoreSnapshot,
 * append-only), jamais pour un usage applicatif nouveau (cf. le commentaire
 * sur l'enum dans schema.prisma : "plus jamais produit ni relu en
 * pratique"). Un override analyste ne doit donc jamais pouvoir être posé sur
 * l'une de ces deux valeurs mortes — seuls les 4 paliers réels (voir
 * SURVEILLANCE_RANK / RANK_TO_BASE_STATUS + CRITIQUE dans
 * surveillance-status.util.ts) sont acceptés ici.
 */
export const VALID_OVERRIDE_STATUSES = ['FAIBLE', 'SOUS_SURVEILLANCE', 'ELEVE', 'CRITIQUE'] as const satisfies readonly DealSurveillanceStatus[];
export type ValidOverrideStatus = (typeof VALID_OVERRIDE_STATUSES)[number];

export class SetAnalystOverrideDto {
  @ApiProperty({ enum: VALID_OVERRIDE_STATUSES })
  @IsIn(VALID_OVERRIDE_STATUSES)
  overrideStatus!: DealSurveillanceStatus;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  justification!: string;
}
