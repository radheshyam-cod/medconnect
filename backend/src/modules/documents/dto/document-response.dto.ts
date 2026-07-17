import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType, ProcessingStatus, Document, Extraction } from "@prisma/client";

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  fileType: string;

  @ApiProperty()
  fileSize: number;

  @ApiPropertyOptional()
  publicUrl?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  documentType?: DocumentType;

  @ApiPropertyOptional()
  documentDate?: Date;

  @ApiProperty({ enum: ProcessingStatus })
  status: ProcessingStatus;

  @ApiPropertyOptional()
  ocrConfidence?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromPrisma(doc: Document): DocumentResponseDto {
    return {
      id: doc.id,
      userId: doc.userId,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      publicUrl: doc.publicUrl || undefined,
      documentType: doc.documentType || undefined,
      documentDate: doc.documentDate || undefined,
      status: doc.status,
      ocrConfidence: doc.ocrConfidence || undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export class DocumentDetailResponseDto extends DocumentResponseDto {
  @ApiPropertyOptional()
  extraction?: Extraction;

  static fromPrisma(doc: Document & { extractions?: Extraction[] }): DocumentDetailResponseDto {
    return {
      ...DocumentResponseDto.fromPrisma(doc),
      extraction: doc.extractions?.[0] || undefined,
    };
  }
}
