import { CreateUserRequest, GetUserByIDRequest,UpdateUserRequest, UserLoginRequest } from '@app/common/types/auth';
import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { UseGuards,HttpCode } from '@nestjs/common';
import { JwtGuard, RolesGuard } from './guards';
import { CurrentUserId } from './decorator/get-user.decorator';
import { Roles } from './decorator/roles.decorator';
import { Role } from './enums/role.enums';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @HttpCode(201)
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
  @UseGuards(JwtGuard,RolesGuard)
  @Roles(Role.ADMIN) 
   @HttpCode(200)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
   @UseGuards(JwtGuard,RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(200)
  @Get(':id')
  findOne(@Param('id') id: string) {
    // Transform: HTTP route param → gRPC request object
    return this.usersService.findOne({ id });
  }
  @UseGuards(JwtGuard)
  @HttpCode(200)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserRequest) {
    // Transform: HTTP route param + body → gRPC request object
    // Destructure to remove any 'id' from body, then use route param
    const { id: _, ...body } = updateUserDto;
    return this.usersService.update({ id, ...body });
  }
   @UseGuards(JwtGuard,RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id') id: string) {
    // Transform: HTTP route param → gRPC request object
    return this.usersService.remove({ id });
  }
  @HttpCode(200)
  @Post('login')
  login(@Body() loginRequest: UserLoginRequest) {
    return this.usersService.login(loginRequest).pipe(
      catchError((error) => {
        console.log('Login error:', error);
        console.log('Error code:', error.code);
        console.log('Error details:', error.details);
        console.log('Error message:', error.message);
        
        if (error.code === 16) { // UNAUTHENTICATED - invalid credentials
          return throwError(() => new HttpException('Invalid username or password', HttpStatus.UNAUTHORIZED));
        }
        if (error.code === 7) { // PERMISSION_DENIED - account issues
          return throwError(() => new HttpException(error.details || error.message, HttpStatus.FORBIDDEN));
        }
        // Default to internal server error for unknown errors
        return throwError(() => new HttpException(
          error.details || error.message || 'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR
        ));
      })
    );
  }
  @UseGuards(JwtGuard)
  @HttpCode(200)
  @Get('me')
  me(@CurrentUserId() userId: string) {
    if (!userId) {
      throw new HttpException('User ID not found in token', HttpStatus.UNAUTHORIZED);
    }
    return this.usersService.findOne({ id: userId });
  }
}
