import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiResponse<T> {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional({ type: Object })
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  @ApiPropertyOptional({ type: Object })
  error?: {
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    errors?: any;
  };

  static success<T>(data: T, meta?: ApiResponse<T>["meta"]): ApiResponse<T> {
    return { success: true, data, meta };
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
