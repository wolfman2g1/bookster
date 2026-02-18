import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_PACKAGE_NAME } from '@app/common/types/auth';
import { join } from 'path';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [ClientsModule.register([
    {
      name: 'AUTH_SERVICE',
      transport: Transport.GRPC,
      options: {
        package: AUTH_PACKAGE_NAME,
        protoPath: join(__dirname, '../../../proto/auth.proto'),
      },
    },
  ])],
})
export class UsersModule {}