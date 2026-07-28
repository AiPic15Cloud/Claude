import { IsString, MinLength } from 'class-validator';

export class TwoFactorVerifyDto {
  @IsString()
  @MinLength(1)
  challengeToken!: string;

  @IsString()
  @MinLength(6)
  code!: string;
}
