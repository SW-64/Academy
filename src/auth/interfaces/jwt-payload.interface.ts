import { Role } from 'src/users/entities/user.entity';

export interface JwtPayload {
  userId: number;
  role: Role;
}
