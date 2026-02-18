import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, UsersModule, ConfigModule.forRoot({
      isGlobal: true, // This makes ConfigModule available everywhere
    }),],
  controllers: [],
  providers: [],
})
export class AuthModule {}
