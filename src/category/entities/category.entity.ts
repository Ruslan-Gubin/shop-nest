import { User } from "src/users/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity()
@Unique(["name", "parent_id"])
export class Category {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "int", default: null, nullable: true, name: "parent_id" })
  parent_id: number | null;

  @Column({ type: "int", default: 0, name: "position" })
  position: number;

  @Column({ type: "boolean", default: false, name: "moderated" })
  moderated: boolean;

  @Column({ type: "boolean", default: true, name: "is_active" })
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

  @Column({ type: "varchar", default: "", name: "name" })
  name: string;

  @Column({ type: "varchar", default: "", name: "description" })
  description: string;

  @Column({ type: "int", default: 0, name: "product_count" })
  product_count: number;

  @Column({ type: "varchar", default: "", name: "image" })
  image: string;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
