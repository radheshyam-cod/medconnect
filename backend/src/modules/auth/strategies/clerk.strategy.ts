import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClerkClient, verifyToken } from "@clerk/backend";

export interface ClerkUserPayload {
  sub: string;        // Clerk user ID (user_xxx)
  sid: string;        // Session ID
  email?: string;
  fullName?: string;
}

@Injectable()
export class ClerkStrategy {
  private readonly logger = new Logger(ClerkStrategy.name);
  private readonly clerkClient: ReturnType<typeof createClerkClient> | null = null;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>("CLERK_SECRET_KEY") || "";

    if (this.secretKey) {
      this.clerkClient = createClerkClient({ secretKey: this.secretKey });
    } else {
      this.logger.warn(
        "CLERK_SECRET_KEY not configured. Authentication will be unavailable.",
      );
    }
  }

  /**
   * Verify a Clerk JWT token, extracting user identity.
   * Uses Clerk's verifyToken which auto-fetches JWKS from Clerk's API.
   */
  async verify(token: string): Promise<ClerkUserPayload> {
    if (!this.clerkClient || !this.secretKey) {
      throw new UnauthorizedException(
        "Clerk is not configured. Set CLERK_SECRET_KEY environment variable.",
      );
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: this.secretKey,
      });

      return {
        sub: payload.sub,
        sid: payload.sid as string,
      };
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException("Invalid or expired authentication token");
    }
  }

  /**
   * Fetch full user details from Clerk API.
   * Can be used to sync user data into the local database.
   */
  async getUserProfile(clerkUserId: string) {
    if (!this.clerkClient) return null;

    try {
      const user = await this.clerkClient.users.getUser(clerkUserId);
      return {
        id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress || "",
        fullName: user.fullName,
        imageUrl: user.imageUrl,
      };
    } catch (err) {
      this.logger.warn(`Failed to fetch Clerk user: ${(err as Error).message}`);
      return null;
    }
  }
}
