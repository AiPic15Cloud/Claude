import { IsString, MinLength } from 'class-validator';

export class TwoFactorDisableDto {
  @IsString()
  @MinLength(1)
  password!: string;

  // Current TOTP code or a recovery code — proves the caller still controls
  // the second factor, not just the password, before it can be turned off.
  @IsString()
  @MinLength(1)
  code!: string;
}
