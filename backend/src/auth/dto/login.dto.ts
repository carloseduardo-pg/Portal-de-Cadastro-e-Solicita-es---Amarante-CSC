import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Body de POST /auth/login. */
export class LoginDto {
  @ApiProperty({ example: 'usuario@exemplo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'sua-senha', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
