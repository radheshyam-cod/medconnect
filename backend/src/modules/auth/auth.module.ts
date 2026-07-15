import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClerkStrategy } from "./strategies/clerk.strategy";
import { ClerkAuthGuard } from "../../common/guards/clerk-auth.guard";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ClerkStrategy, ClerkAuthGuard],
  exports: [ClerkStrategy, ClerkAuthGuard],
})
export class AuthModule {}
