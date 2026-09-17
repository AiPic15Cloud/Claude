import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDocumentDto {
  @ApiProperty({ required: false, description: 'Libre — ex. "acte de propriété", "bilan comptable N-1", "permis de construire".' })
  @IsOptional()
  @IsString()
  classification?: string;
}
