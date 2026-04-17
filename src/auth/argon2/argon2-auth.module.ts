import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Argon2AuthService } from './argon2-auth.service';
import { Argon2AuthController } from './argon2-auth.controller';
import { Argon2LocalStrategy } from './strategies/argon2-local.strategy';
import { AuthModule } from '../auth.module';
import { User } from '../../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), PassportModule, AuthModule],
  controllers: [Argon2AuthController],
  providers: [Argon2AuthService, Argon2LocalStrategy],
})
export class Argon2AuthModule {}
