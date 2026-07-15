import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { StorageService, UploadResult } from "./interfaces/storage.interface";

@Injectable()
export class SupabaseStorageService implements StorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseKey = this.configService.get<string>("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        "Supabase credentials not configured. Storage operations will fail.",
      );
    }

    this.supabase = createClient(supabaseUrl!, supabaseKey!, {
      auth: { persistSession: false },
    });
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType,
          upsert: true,
        });

      if (error) {
        this.logger.error(`Supabase upload error: ${error.message}`, error);
        throw new InternalServerErrorException(
          `File upload failed: ${error.message}`,
        );
      }

      const { data: urlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        publicUrl: urlData.publicUrl,
      };
    } catch (err) {
      this.logger.error(`Upload failed for ${path}`, err);
      throw err;
    }
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);

    if (error) {
      this.logger.error(`Supabase delete error: ${error.message}`, error);
      throw new InternalServerErrorException(
        `File deletion failed: ${error.message}`,
      );
    }
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600,
  ): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      this.logger.warn(`Could not create signed URL: ${error.message}`);
      return null;
    }

    return data.signedUrl;
  }

  getPublicUrl(bucket: string, path: string): string | null {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage.from(bucket).download(path);

    if (error) {
      this.logger.error(`Supabase download error: ${error.message}`, error);
      throw new InternalServerErrorException(
        `File download failed: ${error.message}`,
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
