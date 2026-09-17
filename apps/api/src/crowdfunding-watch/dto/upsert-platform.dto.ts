import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

const CONNECTOR_STATUSES = ['OPERATIONAL', 'PARTIAL', 'BLOCKED', 'TO_BUILD'] as const;

export class UpsertPlatformDto {
  @IsString()
  sourceKey!: string;

  @IsString()
  label!: string;

  @IsString()
  platformName!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  listingUrl?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  accessMethod?: string;

  @IsOptional()
  @IsIn(CONNECTOR_STATUSES)
  connectorStatus?: (typeof CONNECTOR_STATUSES)[number];

  @IsOptional()
  @IsBoolean()
  authenticationRequiredForDocuments?: boolean;

  @IsOptional()
  @IsString()
  coverageNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  targetCheckFrequencySeconds?: number;
}
