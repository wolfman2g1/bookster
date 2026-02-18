import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UserServiceController,
  UserServiceControllerMethods,
  CreateUserRequest,
  UpdateUserRequest,
  GetUserByIDRequest,
  DeleteUserRequest,
  UserLoginRequest,
  ConfirmEmailRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
} from '@app/common/types/auth';
import { Empty } from '../../../../google/protobuf/empty';

@UserServiceControllerMethods()
@Controller()
export class UsersController implements UserServiceController {
  constructor(private readonly usersService: UsersService) {}

  createUser(request: CreateUserRequest) {
    return this.usersService.create(request);
  }

  getAllUsers(request: Empty) {
    return this.usersService.findAll();
  }

  getUserById(request: GetUserByIDRequest) {
    return this.usersService.findOne(request.id);
  }

  updateUser(request: UpdateUserRequest) {
   
    return this.usersService.update(request);
  }

  deleteUser(request: DeleteUserRequest) {
    return this.usersService.remove(request.id);
  }
  login(request: UserLoginRequest) {
    return this.usersService.login(request);
  }

  confirmEmail(request: ConfirmEmailRequest) {
    return this.usersService.confirmEmail(request);
  }

  resetPassword(request: ResetPasswordRequest) {
    return this.usersService.resetPassword(request);
  }

  refreshToken(request: RefreshTokenRequest) {
    return this.usersService.refreshToken(request);
  }
}
