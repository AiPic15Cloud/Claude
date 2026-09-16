import { IsOptional, IsString } from 'class-validator';

export class RejectEntityLinkDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
