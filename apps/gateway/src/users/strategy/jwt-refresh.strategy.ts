import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as argon from 'argon2';
import { firstValueFrom } from 'rxjs';
import { UsersService } from '../users.service';


@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService,
   private readonly usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      secretOrKey:
        config.get<string>('JWT_REFRESH_SECRET') ||
        (() => {
          throw new Error('JWT_REFRESH_SECRET is not defined');
        })(),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const refreshToken = req.body?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }
    const user = await firstValueFrom(this.usersService.findOne({ id: payload.sub }));

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // Verify the refresh token
    const isRefreshTokenValid = await argon.verify(
      user.refreshToken,
      refreshToken,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Return user without the refresh token
    const { refreshToken: _, ...userWithoutToken } = user;
    return userWithoutToken;
  }
}