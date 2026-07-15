import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SupabaseStorageService } from "./supabase-storage.service";
import { STORAGE_TOKEN } from "./interfaces/storage.interface";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_TOKEN,
      useClass: SupabaseStorageService,
    },
  ],
  exports: [STORAGE_TOKEN],
})
export class StorageModule {}
