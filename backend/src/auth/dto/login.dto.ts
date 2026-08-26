import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Body de POST /auth/login. */
export class LoginDto {
  @ApiProperty({ example: 'admin@amarante.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'amarante123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
