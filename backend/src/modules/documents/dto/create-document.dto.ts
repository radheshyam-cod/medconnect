import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { DocumentType } from "@prisma/client";

export class CreateDocumentDto {
  @ApiProperty({ description: "File (multipart upload)" })
  file: Express.Multer.File;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentDate?: string;
}
