import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VoiceAssistantService } from './voice-assistant.service';
import { VoiceCommandDto, VoiceResponseDto } from './dto/voice-command.dto';

@ApiTags('Voice Assistant')
@Controller('voice')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class VoiceAssistantController {
  constructor(private readonly voiceService: VoiceAssistantService) {}

  @Post('interact')
  @ApiOperation({
    summary: 'Process voice/text interaction using Gnani.ai STT -> AI Intent -> TTS flow',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('audio'))
  async interact(
    @CurrentUser('id') userId: string,
    @Body() dto: VoiceCommandDto,
    @UploadedFile() audio?: Express.Multer.File,
  ): Promise<VoiceResponseDto> {
    return this.voiceService.processCommand(userId, dto, audio?.buffer);
  }
}
