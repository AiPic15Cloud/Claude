import { OmitType, PartialType } from '@nestjs/swagger';
import { UpsertPlatformDto } from './upsert-platform.dto';

export class UpdatePlatformDto extends PartialType(OmitType(UpsertPlatformDto, ['sourceKey'] as const)) {}
