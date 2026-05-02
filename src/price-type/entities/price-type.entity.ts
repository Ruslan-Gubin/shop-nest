import { User } from "src/users/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class PriceType {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "boolean", default: false, name: "isPublic" })
  isPublic: boolean;

  @Column({ type: "int", nullable: true, default: null, name: "minQuantity" })
  minQuantity: number;

  @ManyToOne(() => User, {
    onDelete: "SET NULL",
    eager: false,
  })
  @JoinColumn({ name: "created_user_id" })
  createdBy: User;

  @Column({
    type: "int",
    nullable: true,
    default: null,
    name: "created_user_id",
  })
  created_user_id: number | null;

  @Column({ type: "varchar", default: "", name: "name" })
  name: string;

  @Column({ type: "varchar", default: "", name: "description" })
  description: string;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}

