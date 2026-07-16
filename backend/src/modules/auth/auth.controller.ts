import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PrismaService } from "../database/prisma.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { IsEmail, IsString, IsOptional } from "class-validator";

export class SyncUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}

@ApiTags("Auth")
@ApiBearerAuth()
@Controller("auth")
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("sync")
  @ApiOperation({ summary: "Sync Clerk user to local database" })
  async syncUser(
    @CurrentUser("id") clerkId: string,
    @Body() dto: SyncUserDto
  ) {
    const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(" ");
    const user = await this.prisma.user.upsert({
      where: { clerkId },
      update: {
        email: dto.email,
        fullName: fullName || "User",
      },
      create: {
        clerkId,
        email: dto.email,
        fullName: fullName || "User",
      },
    });
    return { success: true, userId: user.id };
  }
}
