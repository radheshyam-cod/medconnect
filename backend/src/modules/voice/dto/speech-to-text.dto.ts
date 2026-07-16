import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class SpeechToTextDto {
  @ApiProperty({
    description: 'Audio file (WAV, MP3, OGG, FLAC, AAC, M4A)',
    type: 'string',
    format: 'binary',
  })
  audio_file: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Language code (BCP-47). Auto-detected if not provided.',
    default: 'en-IN',
    enum: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN', 'bn-IN'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN', 'bn-IN'])
  language_code?: string = 'en-IN';

  @ApiPropertyOptional({
    description: 'Output format: verbatim (raw) or transcribe (with normalization)',
    default: 'transcribe',
    enum: ['verbatim', 'transcribe'],
  })
  @IsOptional()
  @IsString()
  format?: 'verbatim' | 'transcribe' = 'transcribe';

  @ApiPropertyOptional({
    description: 'Render digits in native script (true/false string)',
    default: 'false',
  })
  @IsOptional()
  @IsString()
  itn_native_numerals?: string = 'false';
}

export class SpeechToTextResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  transcript: string;

  @ApiProperty()
  requestId: string;

  @ApiProperty()
  latencyMs: number;

  @ApiPropertyOptional()
  detectedLanguage?: string;
}
