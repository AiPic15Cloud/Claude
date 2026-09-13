import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

export class ScoreAnswerDto {
  @ApiProperty()
  @IsString()
  criterionId!: string;

  @ApiProperty()
  @IsString()
  bucketId!: string;
}

export class SubmitScoreAssessmentDto {
  @ApiProperty({ type: [ScoreAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreAnswerDto)
  answers!: ScoreAnswerDto[];
}
