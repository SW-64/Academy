import { Role } from '../entities/user.entity';

export interface PartialUser {
  userId: number;
  role: Role;
}
