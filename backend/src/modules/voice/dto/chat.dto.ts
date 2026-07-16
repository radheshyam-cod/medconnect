import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class VoiceChatDto {
  @ApiProperty({
    description: 'Audio file containing the user\'s spoken question (WAV, MP3, OGG, FLAC, AAC, M4A)',
    type: 'string',
    format: 'binary',
  })
  audio_file: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Language code for STT (BCP-47). Defaults to en-IN.',
    default: 'en-IN',
    enum: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN', 'bn-IN'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN', 'bn-IN'])
  language_code?: string = 'en-IN';

  @ApiPropertyOptional({
    description: 'Voice for TTS response. Defaults to Pranav.',
    default: 'Pranav',
  })
  @IsOptional()
  @IsString()
  voice?: string = 'Pranav';

  @ApiPropertyOptional({
    description: 'Conversation ID for continuing a previous conversation. Omit to start new.',
  })
  @IsOptional()
  @IsString()
  conversation_id?: string;

  @ApiPropertyOptional({
    description: 'Whether to return audio in the response (true/false). Defaults to true.',
    default: 'true',
  })
  @IsOptional()
  @IsString()
  include_audio?: string = 'true';
}

export class VoiceChatResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({
    description: 'Transcribed user question text',
  })
  text: string;

  @ApiProperty({
    description: 'AI-generated answer text',
  })
  answer: string;

  @ApiPropertyOptional({
    description: 'Base64-encoded TTS audio of the answer',
  })
  audioBase64?: string;

  @ApiPropertyOptional()
  audioMimeType?: string;

  @ApiProperty({
    description: 'Unique conversation ID for follow-up questions',
  })
  conversationId: string;

  @ApiProperty()
  sttLatencyMs: number;

  @ApiProperty()
  aiLatencyMs: number;

  @ApiPropertyOptional()
  ttsLatencyMs?: number;

  @ApiProperty()
  totalLatencyMs: number;
}
