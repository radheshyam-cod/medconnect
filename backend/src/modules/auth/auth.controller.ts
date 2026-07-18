import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PrismaService } from "../database/prisma.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { IsEmail, IsString, IsOptional, IsArray } from "class-validator";

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

export class OnboardDto {
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsArray()
  @IsOptional()
  allergies?: string[];

  @IsString()
  @IsOptional()
  emergencyContact?: string;
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
      include: { patientProfile: true }
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
        include: { patientProfile: true }
      });
    }

    let finalUser;
    if (existingUser) {
      finalUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          clerkId,
          email: cleanEmail,
          fullName: fullName || existingUser.fullName || "User",
          ...(dto.phone ? { phone: dto.phone } : {}),
        },
        include: { patientProfile: true }
      });
    } else {
      finalUser = await this.prisma.user.create({
        data: {
          clerkId,
          email: cleanEmail,
          fullName: fullName || "User",
          phone: dto.phone || null,
        },
        include: { patientProfile: true }
      });
    }
    
    // Check if onboarded (i.e. has a patient profile)
    const isOnboarded = !!finalUser.patientProfile;
    return { success: true, userId: finalUser.id, isOnboarded };
  }

  @Post("onboard")
  @ApiOperation({ summary: "Complete user onboarding by creating patient profile" })
  async onboard(
    @CurrentUser("id") clerkId: string,
    @Body() dto: OnboardDto
  ) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      throw new Error("User not found");
    }

    const patientProfile = await this.prisma.patientProfile.upsert({
      where: { userId: user.id },
      update: {
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        allergies: dto.allergies || [],
        emergencyContact: dto.emergencyContact,
      },
      create: {
        userId: user.id,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        allergies: dto.allergies || [],
        emergencyContact: dto.emergencyContact,
      }
    });

    return { success: true, patientProfile };
  }
}
