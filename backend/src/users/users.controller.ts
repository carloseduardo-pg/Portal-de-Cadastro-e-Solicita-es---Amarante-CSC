import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequireCap } from '../auth/require-cap.decorator';
import { parsePage } from '../common/pagination';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

/**
 * REST API for seller users.
 */
@Controller('users')
@RequireCap('users.manage')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Lists users with search/pagination. */
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.users.findAll({
      search,
      ...parsePage(page, pageSize),
    });
  }

  /** Returns a single user. */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  /** Creates a user. */
  @Post()
  @RequireCap('users.manage')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  /** Updates a user. */
  @Patch(':id')
  @RequireCap('users.manage')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(id, dto);
  }

  /** Deactivates a user. */
  @Delete(':id')
  @RequireCap('users.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.remove(id);
  }
}
