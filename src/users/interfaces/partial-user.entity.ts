import { Role } from '../entities/user.entity';

export interface PartialUser {
  user_id: number;
  role: Role;
}
