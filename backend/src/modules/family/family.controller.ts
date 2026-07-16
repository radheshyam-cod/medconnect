import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FamilyService } from './family.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FamilyRelationType } from '@prisma/client';

import { IsString, IsNotEmpty, IsEmail, IsEnum } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(FamilyRelationType)
  @IsNotEmpty()
  relation: FamilyRelationType;
}

@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get('groups')
  getGroups(@CurrentUser('id') clerkId: string) {
    return this.familyService.getFamilyGroups(clerkId);
  }

  @Post('groups')
  createGroup(
    @CurrentUser('id') clerkId: string,
    @Body() dto: CreateGroupDto
  ) {
    return this.familyService.createGroup(clerkId, dto.name);
  }

  @Post('groups/:id/invite')
  inviteMember(
    @CurrentUser('id') clerkId: string,
    @Param('id') groupId: string,
    @Body() dto: InviteMemberDto
  ) {
    return this.familyService.inviteMember(clerkId, groupId, dto.email, dto.relation);
  }

  @Post('groups/:id/respond')
  respondToInvite(
    @CurrentUser('id') clerkId: string,
    @Param('id') groupId: string,
    @Body('action') action: 'ACCEPT' | 'REJECT'
  ) {
    return this.familyService.respondToInvite(clerkId, groupId, action);
  }
}
