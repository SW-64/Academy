import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';
import { MESSAGES } from '../../constants/message.constant';
import { User } from '../../users/entities/user.entity';
import { PartialUser } from 'src/users/interfaces/partial-user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<PartialUser | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        userId: true,
        password: true,
        isApproved: true,
        role: true,
      },
    });
    if (!user) return null; // 아이디 없음 → null → Guard가 401

    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword) return null; // 비번 틀림 → null → Guard가 401

    if (!user.isApproved) {
      throw new ForbiddenException(MESSAGES.AUTH.SIGN_IN.NOT_APPROVED);
    }
    // 여기서 컨트롤러에 넘겨줄 최소 정보만 리턴
    const partialUser: PartialUser = {
      userId: user.userId,
      role: user.role,
    };

    return partialUser;
  }
}
