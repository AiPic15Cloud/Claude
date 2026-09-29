import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role, WorkspaceScope } from '@prisma/client';

export class CreateTeamMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ enum: WorkspaceScope, description: 'Quel périmètre ce profil peut voir — FULL (tout) ou FRACTIONAL_ONLY (Fractionné uniquement, aucune donnée Dette).' })
  @IsEnum(WorkspaceScope)
  workspaceScope!: WorkspaceScope;
}
