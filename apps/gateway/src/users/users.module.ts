import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_PACKAGE_NAME } from '@app/common/types/auth';
import { join } from 'path';
import { AUTH_SERVICE } from './constancts';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [ClientsModule.register([
    {
      name: AUTH_SERVICE,
      transport: Transport.GRPC,
      options: {
        package: AUTH_PACKAGE_NAME,
        protoPath: join(process.cwd(), 'proto/auth.proto'),
        url: 'localhost:5001', // Must match auth service URL
      },
    },
  ])],
})
export class UsersModule {}