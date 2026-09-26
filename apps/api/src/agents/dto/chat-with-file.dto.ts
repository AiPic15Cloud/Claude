import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// multipart/form-data fields arrive as strings — history is JSON-encoded
// ChatMessage[] rather than a nested object, since class-validator can't
// parse structured arrays out of a multipart body the way it does for JSON.
// The 1_000_000-char cap below is a coarse guard sized for the same limits
// enforced on the array once decoded (max 50 messages, see
// AgentsController.chatWithFile) — @ArrayMaxSize/@MaxLength can't be applied
// to the still-encoded string itself.
export class ChatWithFileDto {
  @ApiProperty()
  @IsString()
  @MaxLength(20000)
  message!: string;

  @ApiProperty({ required: false, description: 'JSON-encoded ChatMessage[] — prior turns of the conversation' })
  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  history?: string;

  @ApiProperty({ required: false, description: 'Deal to attach as context, if relevant to this agent' })
  @IsOptional()
  @IsString()
  dealId?: string;
}
