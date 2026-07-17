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

  @IsString()
  @IsOptional()
  phone?: string;
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
    const cleanEmail = dto.email.trim().toLowerCase();
    const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(" ");
    
    // First check if user exists by clerkId
    let existingUser = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    // If not found by clerkId, check if a pending user was created by email (e.g. from a family invite)
    if (!existingUser && cleanEmail) {
      existingUser = await this.prisma.user.findFirst({
        where: {
          email: {
            equals: cleanEmail,
            mode: "insensitive",
          },
        },
      });
    }

    if (existingUser) {
      const user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          clerkId,
          email: cleanEmail,
          fullName: fullName || existingUser.fullName || "User",
          ...(dto.phone ? { phone: dto.phone } : {}),
        },
      });
      return { success: true, userId: user.id };
    } else {
      const user = await this.prisma.user.create({
        data: {
          clerkId,
          email: cleanEmail,
          fullName: fullName || "User",
          phone: dto.phone || null,
        },
      });
      return { success: true, userId: user.id };
    }
  }
}

