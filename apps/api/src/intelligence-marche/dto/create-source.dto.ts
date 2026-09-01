import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSourceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ description: 'Connector key — see GET /market-intelligence/connectors' })
  @IsString()
  connector!: string;

  @ApiProperty({ required: false, description: 'Search query (data-gouv connector) or reference URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
