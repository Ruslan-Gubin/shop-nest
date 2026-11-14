import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Photo } from 'src/photo/entities/photo.entity';

export type UserRole = 'user' | 'admin' | 'moderator' | 'wholesaler';

@Entity()
export class User {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({
    type: 'varchar',
    default: '',
    name: 'name',
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    default: '',
    name: 'phone',
    nullable: false,
    unique: true,
  })
  phone: string;

  @Column({
    type: 'varchar',
    default: null,
    name: 'email',
    nullable: true,
    unique: true,
  })
  email: string | null;

  @Column({ type: 'varchar', default: '', name: 'refresh' })
  refresh: string;

  @Column({ type: 'varchar', default: '', name: 'password' })
  password: string;

  @Column({ type: 'int', default: null, name: 'department_id' })
  department_id: number | null;

  @Column({ type: 'varchar', default: 'user', name: 'role' })
  role: UserRole;

  photo?: Photo | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null })
  updated_at: Date | null;
}
