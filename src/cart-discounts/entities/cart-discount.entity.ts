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
export class CartDiscount {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", default: "", name: "name" })
  name: string;

  @Column({ type: "int", default: 0, name: "min_sum" })
  min_sum: number;

  @Column({ type: "int", default: 0, name: "discount_percent" })
  percent: number;

  @Column({ type: "varchar", default: "", name: "apply_to" })
  apply_to: string;

  @Column({ type: "boolean", default: false, name: "is_active" })
  is_active: boolean;

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

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null, name: "updated_at" })
  updated_at: Date | null;
}

