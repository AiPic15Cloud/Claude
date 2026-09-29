import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role, WorkspaceScope } from '@prisma/client';

export class UpdateTeamMemberAccessDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ enum: WorkspaceScope })
  @IsEnum(WorkspaceScope)
  workspaceScope!: WorkspaceScope;
}
