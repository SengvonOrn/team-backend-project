import { IsOptional, IsString, IsNumberString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCustomerDto {
  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  @Min(1, { message: 'Page must be greater than 0' })
  page?: number = 1;

  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;
}