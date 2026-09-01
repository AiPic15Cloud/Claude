import { IsString, MinLength } from 'class-validator';

export class TwoFactorDisableDto {
  @IsString()
  @MinLength(1)
  password!: string;
}
