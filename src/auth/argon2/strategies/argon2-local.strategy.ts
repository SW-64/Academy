import { ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { Status, User } from '../../../users/entities/user.entity';
import { PartialUser } from '../../../users/interfaces/partial-user.entity';
import { MESSAGES } from '../../../constants/message.constant';

@Injectable()
export class Argon2LocalStrategy extends PassportStrategy(
  Strategy,
  'argon2-local',
) {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    super({
      usernameField: 'loginId',
      passwordField: 'password',
    });
  }

  async validate(
    loginId: string,
    password: string,
  ): Promise<PartialUser | null> {
    const user = await this.userRepository.findOne({
      where: { loginId },
      select: {
        userId: true,
        password: true,
        status: true,
        role: true,
      },
    });
    if (!user) return null;

    const isValid = await argon2.verify(user.password, password);
    if (!isValid) return null;

    if (user.status !== Status.approved) {
      throw new ForbiddenException(MESSAGES.AUTH.ERROR.NOT_APPROVED);
    }

    const partialUser: PartialUser = {
      userId: user.userId,
      role: user.role,
    };

    return partialUser;
  }
}
