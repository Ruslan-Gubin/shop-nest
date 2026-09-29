import { UserRole } from "src/users/entities/user.entity";

export type CurrentStrategyUser = {
  sub: number;
  password: string;
  iat: number;
  exp: number;
  refresh: string;
  role: UserRole;
  email: string;
  name: string;
  phone: string;
};
