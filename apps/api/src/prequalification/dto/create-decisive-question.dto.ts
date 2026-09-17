import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const PRIORITIES = ['blocking', 'decisive', 'instruction', 'comfort'] as const;

export class CreateDecisiveQuestionDto {
  @ApiProperty()
  @IsString()
  question!: string;

  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedFindingIds?: string[];

  @ApiProperty()
  @IsBoolean()
  answerCouldChangeOrientation!: boolean;

  @ApiProperty({ enum: PRIORITIES })
  @IsIn(PRIORITIES)
  priority!: (typeof PRIORITIES)[number];
}

export class AnswerDecisiveQuestionDto {
  @ApiProperty()
  @IsString()
  answer!: string;
}
