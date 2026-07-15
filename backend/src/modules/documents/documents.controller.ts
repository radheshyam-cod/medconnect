import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseFilePipeBuilder,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from "@nestjs/swagger";
import { DocumentsService } from "./documents.service";
import { QueryDocumentDto } from "./dto/query-document.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { DocumentResponseDto, DocumentDetailResponseDto } from "./dto/document-response.dto";
import { DocumentType } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Documents")
@ApiBearerAuth()
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload a medical document (PDF, image)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @CurrentUser('id') clerkId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^(application\/pdf|image\/(jpeg|png|webp|tiff))$/,
        })
        .addMaxSizeValidator({ maxSize: 20 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @Body("documentType") documentType?: string,
    @Body("documentDate") documentDate?: string,
  ): Promise<DocumentResponseDto> {
    const docType = documentType ? (documentType as DocumentType) : undefined;
    return this.documentsService.upload(clerkId, file, docType, documentDate);
  }

  @Get()
  @ApiOperation({ summary: "List all documents for the current user" })
  async findAll(
    @CurrentUser('id') clerkId: string,
    @Query() queryParams: QueryDocumentDto,
  ): Promise<{ documents: DocumentResponseDto[]; total: number }> {
    return this.documentsService.findAll(clerkId, queryParams);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get document details with extraction" })
  async findOne(
    @CurrentUser('id') clerkId: string,
    @Param("id") id: string,
  ): Promise<DocumentDetailResponseDto> {
    return this.documentsService.findOne(clerkId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update document metadata" })
  async update(
    @CurrentUser('id') clerkId: string,
    @Param("id") id: string,
    @Body() updateDto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.update(clerkId, id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a document" })
  async remove(@CurrentUser('id') clerkId: string, @Param("id") id: string): Promise<void> {
    return this.documentsService.remove(clerkId, id);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Get a signed download URL for a document" })
  async getDownloadUrl(
    @CurrentUser('id') clerkId: string,
    @Param("id") id: string,
  ): Promise<{ url: string | null }> {
    const url = await this.documentsService.getDownloadUrl(clerkId, id);
    return { url };
  }
}
