import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SpeechToTextDto, SpeechToTextResponseDto } from './dto/speech-to-text.dto';
import { TextToSpeechDto, TextToSpeechResponseDto } from './dto/text-to-speech.dto';
import { VoiceChatDto, VoiceChatResponseDto, TextChatDto } from './dto/chat.dto';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Voice')
@ApiBearerAuth()
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('speech-to-text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Convert speech audio to text using Gnani.ai STT',
    description:
      'Upload an audio file (WAV, MP3, OGG, etc.) and get the transcribed text. ' +
      'Supports 10 Indian languages including English, Hindi, Tamil, Telugu, Kannada, Malayalam, and more.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Audio file and language options',
    type: SpeechToTextDto,
  })
  @UseInterceptors(
    FileInterceptor('audio_file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AUDIO_SIZE },
    }),
  )
  async speechToText(
    @CurrentUser('id') clerkId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_AUDIO_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    audio_file: Express.Multer.File,
    @Body('language_code') languageCode?: string,
  ): Promise<SpeechToTextResponseDto> {
    const validatedLang = VoiceService.validateLanguageCode(languageCode || 'en-IN');
    return this.voiceService.speechToText(
      clerkId,
      audio_file,
      validatedLang,
    );
  }

  @Post('text-to-speech')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Convert text to speech audio using Gnani.ai TTS',
    description:
      'Send text and get back a base64-encoded WAV audio file. ' +
      'Supports multiple voices and languages.',
  })
  async textToSpeech(
    @CurrentUser('id') clerkId: string,
    @Body() dto: TextToSpeechDto,
  ): Promise<TextToSpeechResponseDto> {
    return this.voiceService.textToSpeech(
      clerkId,
      dto.text,
      dto.voice || 'Pranav',
      dto.language_code || 'en-IN',
    );
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Voice chat with AI health assistant',
    description:
      'Upload a spoken question. The system will:\n' +
      '1. Transcribe speech using Gnani.ai STT\n' +
      '2. Analyze the question with Gemini using patient health data\n' +
      '3. Generate a spoken response using Gnani.ai TTS\n\n' +
      'Returns transcribed text, AI answer, and optionally audio.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Audio question with voice and language options',
    type: VoiceChatDto,
  })
  @UseInterceptors(
    FileInterceptor('audio_file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AUDIO_SIZE },
    }),
  )
  async voiceChat(
    @CurrentUser('id') clerkId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_AUDIO_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    audio_file: Express.Multer.File,
    @Body('language_code') languageCode?: string,
    @Body('voice') voice?: string,
    @Body('conversation_id') conversationId?: string,
    @Body('include_audio') includeAudio?: string,
  ): Promise<VoiceChatResponseDto> {
    const validatedLang = VoiceService.validateLanguageCode(languageCode || 'en-IN');
    return this.voiceService.voiceChat(
      clerkId,
      audio_file,
      validatedLang,
      voice || 'Pranav',
      conversationId || undefined,
      includeAudio !== 'false',
    );
  }

  @Post('text-chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Text chat with AI health assistant',
    description:
      'Send a text question. The system will:\n' +
      '1. Analyze the question with Gemini using patient health data\n' +
      '2. Generate a spoken response using Gnani.ai TTS (optional)\n\n' +
      'Returns the AI answer and optionally audio.',
  })
  async textChat(
    @CurrentUser('id') clerkId: string,
    @Body() dto: TextChatDto,
  ): Promise<VoiceChatResponseDto> {
    const validatedLang = VoiceService.validateLanguageCode(dto.language_code || 'en-IN');
    return this.voiceService.textChat(
      clerkId,
      dto.text,
      validatedLang,
      dto.voice || 'Pranav',
      dto.conversation_id || undefined,
      dto.include_audio === true || dto.include_audio === 'true',
    );
  }
}
