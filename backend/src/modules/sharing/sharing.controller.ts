import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { SharingService } from './sharing.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class SharedResourceDto {
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @IsString()
  @IsNotEmpty()
  resourceId: string;
}

export class CreateLinkDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  expiresInDays?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SharedResourceDto)
  resources: SharedResourceDto[];
}

@Controller('sharing')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Get('links')
  listLinks(@CurrentUser('id') clerkId: string) {
    return this.sharingService.listLinks(clerkId);
  }

  @Post('links')
  createLink(
    @CurrentUser('id') clerkId: string,
    @Body() dto: CreateLinkDto
  ) {
    return this.sharingService.createLink(clerkId, dto.title || 'Shared Record', dto.expiresInDays, dto.resources);
  }

  @Delete('links/:id')
  revokeLink(
    @CurrentUser('id') clerkId: string,
    @Param('id') id: string
  ) {
    return this.sharingService.revokeLink(clerkId, id);
  }

  // NOTE: In a real app, this should probably bypass ClerkAuthGuard using a custom Public decorator.
  // For the sake of simplicity and scaffolding, we will keep it under the same controller.
  @Public()
  @Get('public/:token')
  getPublicSharedData(@Param('token') token: string) {
    return this.sharingService.getPublicSharedData(token);
  }
}
