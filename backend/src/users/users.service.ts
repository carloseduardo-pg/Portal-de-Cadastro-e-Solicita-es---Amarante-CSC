import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import {
  pageResult,
  skipTake,
  type PageParams,
} from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const userSelect = {
  id: true,
  name: true,
  email: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/**
 * CRUD service for seller users.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists users with optional text search and pagination.
   */
  async findAll(params: { search?: string } & PageParams) {
    const where: Prisma.UserWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }

  /**
   * Returns one user by id.
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  /**
   * Creates a user with hashed password.
   */
  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('E-mail já cadastrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        passwordHash,
        active: dto.active ?? true,
      },
      select: userSelect,
    });
  }

  /**
   * Updates a user; hashes password when provided.
   */
  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.email) {
      const email = dto.email.toLowerCase();
      const conflict = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (conflict) throw new ConflictException('E-mail já cadastrado');
    }
    const data: Prisma.UserUpdateInput = {
      name: dto.name,
      email: dto.email?.toLowerCase(),
      active: dto.active,
    };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  /**
   * Soft-deactivates a user (sets active=false). Hard delete avoided for FK integrity.
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
      select: userSelect,
    });
  }
}
