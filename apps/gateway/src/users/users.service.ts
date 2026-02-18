import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateUserRequest, GetUserByIDRequest, UserServiceClient, DeleteUserRequest, UpdateUserRequest, USER_SERVICE_NAME } from '@app/common/types/auth';
import { AUTH_SERVICE } from './constancts';
import { ClientGrpc } from '@nestjs/microservices';

@Injectable()
export class UsersService implements OnModuleInit {
  private userService: UserServiceClient;
  constructor(@Inject(AUTH_SERVICE) private client: ClientGrpc)
  { }
  onModuleInit() {
    this.userService = this.client.getService<UserServiceClient>(USER_SERVICE_NAME);
  }
  create(createUserDto: CreateUserRequest) {
    return this.userService.createUser(createUserDto);
  }

  findAll() {
    return this.userService.getAllUsers({});
  }

  findOne(id: GetUserByIDRequest) {
    return this.userService.getUserById(id);
  }

  update(updateUserDto: UpdateUserRequest) {
    return this.userService.updateUser(updateUserDto);
  }

  remove(id: DeleteUserRequest) {
    return this.userService.deleteUser(id);
  }
}
