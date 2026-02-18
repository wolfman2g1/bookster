import { Injectable, Logger } from '@nestjs/common';
import { CreateUserRequest, UpdateUserRequest, User, Users, UserLoginRequest, AuthUser, ConfirmEmailRequest, ResetPasswordRequest, RefreshTokenRequest } from '@app/common/types/auth';
import { DatabaseService } from '@app/common';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as argon from 'argon2';
import { generateConfirmationToken, generateTempPassword, getConfirmationTokenExpiry } from '@app/common/utils';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
  
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private prisma: DatabaseService,
    private jwtService: JwtService,
     private configService: ConfigService
  ) {}

  async create(createUserRequest: CreateUserRequest): Promise<User> {
    // create a new user
    const hash = await argon.hash(createUserRequest.password);
    const confirmationToken = generateConfirmationToken();
    const confirmationTokenExpiry = getConfirmationTokenExpiry();
    const user = await this.prisma.user.create({
      data: {
        username: createUserRequest.username,
        email: createUserRequest.email,
        first_name: createUserRequest.firstName,
        last_name: createUserRequest.lastName,
        passwordHash: hash,
        confirmationToken: confirmationToken,
        confirmationTokenExpires: confirmationTokenExpiry,
      }
    });
    this.logger.log(`Created user with ID: ${user.id}`);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      role: user.role,
      confirmed: user.confirmed,
      confirmationToken: user.confirmationToken || '',
      confirmationTokenExpires: user.confirmationTokenExpires // i think this takes the string of the date and converts it
        ? {
            seconds: Math.floor(new Date(user.confirmationTokenExpires).getTime() / 1000),
            nanos: (new Date(user.confirmationTokenExpires).getTime() % 1000) * 1_000_000,
          }
        : undefined,
    };
  }

  findAll(): Observable<Users> {
    this.logger.log('Fetching all users');
    return from(this.prisma.user.findMany()).pipe(
      map(users => ({
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          role: user.role,
          confirmed: user.confirmed,
          confirmationToken: user.confirmationToken || '',
          confirmationTokenExpires: user.confirmationTokenExpires
            ? {
                seconds: Math.floor(new Date(user.confirmationTokenExpires).getTime() / 1000),
                nanos: (new Date(user.confirmationTokenExpires).getTime() % 1000) * 1_000_000,
              }
            : undefined,
        })),
      }))
    );
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    this.logger.log(`Fetched user with ID: ${user.id}`);
    return ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      role: user.role,
      confirmed: user.confirmed,
      confirmationToken: user.confirmationToken || '',
      confirmationTokenExpires: user.confirmationTokenExpires
        ? {
            seconds: Math.floor(new Date(user.confirmationTokenExpires).getTime() / 1000),
            nanos: (new Date(user.confirmationTokenExpires).getTime() % 1000) * 1_000_000,
          }
        : undefined,
    });
  }

  async update( updateUserRequest: UpdateUserRequest): Promise<User> {
    const { id, username, email, firstName, lastName, role, confirmed } = updateUserRequest;
    if (!id) {
      throw new Error('User ID is required for update');
    } 
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    // check if the user changed their password, if so hash the new password
    if (updateUserRequest.password) {
      const hash = await argon.hash(updateUserRequest.password);
      await this.prisma.user.update({
        where: { id },
        data: {
          passwordHash: hash,
        }
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        username : username || user.username,
        email: email || user.email,
        first_name: firstName || user.first_name,
        last_name: lastName || user.last_name,
        confirmed: confirmed !== undefined ? confirmed : user.confirmed,


      }
    });
    this.logger.log(`Updated user with ID: ${updatedUser.id}`);
    return ({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.first_name || '',
      lastName: updatedUser.last_name || '',
      role: updatedUser.role,
      confirmed: updatedUser.confirmed,
      confirmationToken: updatedUser.confirmationToken || '',
      confirmationTokenExpires: updatedUser.confirmationTokenExpires
        ? {
            seconds: Math.floor(new Date(updatedUser.confirmationTokenExpires).getTime() / 1000),
            nanos: (new Date(updatedUser.confirmationTokenExpires).getTime() % 1000) * 1_000_000,
          }
        : undefined,
    });
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
      this.logger.log(`Deleted user with ID: ${id}`);
    } catch (error) {
      throw new Error('User not found');
    }
  } 
  async login(request: UserLoginRequest): Promise<AuthUser> {
    // find user by username
    const user = await this.prisma.user.findUnique({ where: { username: request.username } });
    if (!user) {
      throw new Error('Invalid username or password');
    }
    // verify password
    const valid = await argon.verify(user.passwordHash, request.password);
    if (!valid) {
      throw new Error('Invalid username or password');
    }
    this.logger.log(`User logged in with ID: ${user.id}`);
    // generate access token and refresh token
    const tokens = await this.generateTokens(user.id, user.username, user.role);
    // store refresh token
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    
    // Return auth user with tokens
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      confirmed: user.confirmed,
      active: user.active,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      mustResetPassword: user.reset || false, // Flag if password reset required
    };
  }
  async confirmEmail(request: ConfirmEmailRequest): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        confirmationToken: request.token,
        confirmationTokenExpires: {
          gt: new Date(),
        },
        confirmed: false,
      },
    });
    if (!user) {
      throw new Error('Invalid or expired confirmation token');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        confirmed: true,
        confirmationToken: null,
        confirmationTokenExpires: null,
      },
    });
    this.logger.log(`Email confirmed for user ID: ${user.id}`);
  }
  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: request.email } });
    if (!user) {
      throw new Error('User not found');
    }
    const tempPassword = generateTempPassword();
    const hash = await argon.hash(tempPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        resetToken: tempPassword,
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    this.logger.log(`Password reset requested for user ID: ${user.id}`);
    //TODO: send temp password to user's email
  }
  async refreshToken(request: RefreshTokenRequest): Promise<AuthUser> {
    // Verify and decode the refresh token to get user info
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(request.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    // Find user by ID from the decoded token
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.refreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Verify the refresh token matches the stored hash
    const tokenMatches = await argon.verify(user.refreshToken, request.refreshToken);
    if (!tokenMatches) {
      throw new Error('Invalid refresh token');
    }

    // Verify refresh token expiration
    if (user.refreshTokenExpires && new Date(user.refreshTokenExpires) < new Date()) {
      throw new Error('Refresh token expired');
    }
    this.logger.log(`Refresh token used for user ID: ${user.id}`);
    // Generate new tokens
    const tokens = await this.generateTokens(user.id, user.username, user.role);
    // Update refresh token
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      confirmed: user.confirmed,
      active: user.active,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      mustResetPassword: user.reset || false,
    };
  }
  async generateTokens(
    userId: string,
    username: string,
    role: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = { sub: userId, username, role };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m', // Short-lived access token
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d', // Long-lived refresh token
      }),
    ]);

    return { access_token, refresh_token };
  }
   async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await argon.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashedRefreshToken,
        refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }
}
