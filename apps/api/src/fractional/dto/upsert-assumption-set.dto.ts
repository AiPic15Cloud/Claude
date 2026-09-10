import { ApiProperty } from '@nestjs/swagger';
import { FractionalAssumptionScenario } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * `values` porte les paramètres de scénario (holdPeriodYears,
 * vacancyCreditLossPct, opexPct, rentGrowthPctPerYear, exitValue,
 * sellingCostsPct, capexByYear, materialityThresholdPct...) — JSON libre
 * plutôt qu'un DTO figé, cohérent avec `FractionalAssumptionSet.values`
 * (spec §0, "la liste des paramètres varie par scénario/évolution du
 * moteur"). fractional-projects.service.ts applique des valeurs par défaut
 * pour toute clé absente.
 */
export class UpsertAssumptionSetDto {
  @ApiProperty({ enum: FractionalAssumptionScenario })
  @IsEnum(FractionalAssumptionScenario)
  scenario!: FractionalAssumptionScenario;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ type: Object })
  @IsObject()
  values!: Record<string, unknown>;
}
