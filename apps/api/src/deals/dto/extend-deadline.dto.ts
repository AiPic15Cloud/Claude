import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ExtendDeadlineDto {
  @ApiProperty()
  @IsDateString()
  dateSignature!: string;

  @ApiProperty()
  @IsDateString()
  nouvelleDateEcheance!: string;
}
