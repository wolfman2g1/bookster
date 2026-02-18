import { CreateUserRequest, GetUserByIDRequest,UpdateUserRequest } from '@app/common/types/auth';
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserRequest) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Transform: HTTP route param → gRPC request object
    return this.usersService.findOne({ id });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserRequest) {
    // Transform: HTTP route param + body → gRPC request object
    // Destructure to remove any 'id' from body, then use route param
    const { id: _, ...body } = updateUserDto;
    return this.usersService.update({ id, ...body });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // Transform: HTTP route param → gRPC request object
    return this.usersService.remove({ id });
  }
}
