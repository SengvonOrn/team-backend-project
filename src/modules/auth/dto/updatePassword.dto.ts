import { IsString, MinLength, Matches } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @MinLength(6, { message: 'Current password must be at least 6 characters' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and numbers',
  })
  newPassword: string;

  @IsString()
  confirmPassword: string;
}
