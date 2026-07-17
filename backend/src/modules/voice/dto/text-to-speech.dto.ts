import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, IsInt, Min, Max } from 'class-validator';

export class TextToSpeechDto {
  @ApiProperty({
    description: 'Text to convert to speech (max 2000 characters)',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @ApiPropertyOptional({
    description: 'Voice to use for synthesis',
    default: 'Pranav',
    enum: ['Pranav', 'Kaveri', 'Shubhra', 'Deepak', 'Karan', 'Simran', 'Nara', 'Riya', 'Viraj', 'Raju'],
  })
  @IsOptional()
  @IsString()
  voice?: string = 'Pranav';

  @ApiPropertyOptional({
    description: 'Language code for TTS (currently en-IN, hi-IN supported)',
    default: 'en-IN',
    enum: ['en-IN', 'hi-IN'],
  })
  @IsOptional()
  @IsString()
  language_code?: string = 'en-IN';

  @ApiPropertyOptional({
    description: 'Sample rate for output audio',
    default: 24000,
    minimum: 8000,
    maximum: 48000,
  })
  @IsOptional()
  @IsInt()
  @Min(8000)
  @Max(48000)
  sample_rate?: number = 24000;
}

export class TextToSpeechResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({
    description: 'Base64-encoded audio data',
  })
  audioBase64: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  durationMs: number;

  @ApiProperty()
  latencyMs: number;
}
