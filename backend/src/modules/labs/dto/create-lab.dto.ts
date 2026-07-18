import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateLabDto {
  @IsString()
  testName: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  referenceRange?: string;

  @IsOptional()
  @IsBoolean()
  isAbnormal?: boolean;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  facility?: string;

  @IsOptional()
  @IsString()
  documentId?: string;
}
