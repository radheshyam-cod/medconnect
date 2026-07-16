import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClerkStrategy } from "./strategies/clerk.strategy";
import { ClerkAuthGuard } from "../../common/guards/clerk-auth.guard";

import { AuthController } from "./auth.controller";

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [ClerkStrategy, ClerkAuthGuard],
  exports: [ClerkStrategy, ClerkAuthGuard],
})
export class AuthModule {}
