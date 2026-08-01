import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// multipart/form-data fields arrive as strings — history is JSON-encoded
// ChatMessage[] rather than a nested object, since class-validator can't
// parse structured arrays out of a multipart body the way it does for JSON.
export class ChatWithFileDto {
  @ApiProperty()
  @IsString()
  message!: string;

  @ApiProperty({ required: false, description: 'JSON-encoded ChatMessage[] — prior turns of the conversation' })
  @IsOptional()
  @IsString()
  history?: string;

  @ApiProperty({ required: false, description: 'Deal to attach as context, if relevant to this agent' })
  @IsOptional()
  @IsString()
  dealId?: string;
}
