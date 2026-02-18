import { CreateUserRequest, GetUserByIDRequest,UpdateUserRequest } from '@app/common/types/auth';
import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserRequest) {
    return this.usersService.create(createUserDto).pipe(
      catchError((error) => {
        // gRPC error codes: 6 = ALREADY_EXISTS, 3 = INVALID_ARGUMENT, etc.
        if (error.code === 6) {
          return throwError(() => new BadRequestException(error.details || error.message));
        }
        if (error.code === 3) {
          return throwError(() => new BadRequestException(error.details || error.message));
        }
        // Default to internal server error for unknown errors
        return throwError(() => new HttpException(
          error.details || error.message || 'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR
        ));
      })
    );
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
