import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ClerkStrategy } from "../../modules/auth/strategies/clerk.strategy";

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly clerkStrategy: ClerkStrategy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow @Public() decorated routes to skip auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization as string | undefined;

    if (!authHeader) {
      throw new UnauthorizedException("Missing authorization header");
    }

    // Support both "Bearer <token>" and bare "<token>" formats
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      throw new UnauthorizedException("Empty authorization token");
    }

    try {
      // Verify the Clerk JWT via JWKS (fetched from Clerk's API)
      const clerkUser = await this.clerkStrategy.verify(token);

      // Attach verified user to request for downstream use
      request.user = {
        id: clerkUser.sub, // This is clerkId
        sessionId: clerkUser.sid,
        // Additional fields can be populated via clerkStrategy.getUserProfile()
      };

      return true;
    } catch (err) {
      this.logger.warn(
        `Authentication failed: ${(err as Error).message}`,
      );
      throw err instanceof UnauthorizedException
        ? err
        : new UnauthorizedException("Authentication failed");
    }
  }
}
