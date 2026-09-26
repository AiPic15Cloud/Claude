import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class ResolveActionItemDto {
  @ApiProperty({ enum: ['TERMINEE', 'ECARTEE'] })
  @IsIn(['TERMINEE', 'ECARTEE'])
  status!: 'TERMINEE' | 'ECARTEE';

  // Toujours requis : une action ne se ferme jamais sans motif (même
  // doctrine que le hard stop §5.4 — une résolution sans preuve/motif n'est
  // pas une résolution).
  @ApiProperty()
  @IsString()
  @MinLength(1)
  resolutionReason!: string;
}
