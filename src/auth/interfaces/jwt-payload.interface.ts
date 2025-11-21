import { Role } from '../../users/entities/user.entity';

export interface JwtPayload {
  userId: number;
  role: Role;
}
