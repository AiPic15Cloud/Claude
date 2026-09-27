import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsPositive, IsString, Min, MaxLength } from 'class-validator';

export class CreateRepaymentDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Part capital réelle, si connue (échéancier, quittance) — doit être fournie avec interestAmount, jamais seule, et leur somme doit égaler amount. Absente (undefined) : champ non touché (update) ou non renseigné (create). null : déliaison explicite (update seulement). ATLAS estime sinon la répartition (crd.util.ts).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  principalAmount?: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'Part intérêts réelle, si connue — voir principalAmount.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestAmount?: number | null;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty({ required: false, default: false, description: 'true = estimation future, false = remboursement réalisé' })
  @IsOptional()
  @IsBoolean()
  projected?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
