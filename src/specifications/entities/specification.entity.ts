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

export type SpecificationType = "text" | "color" | "number";

@Entity()
export class Specification {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", default: "", nullable: false, unique: true, name: "name" })
  name: string;

  @Column({
    type: "varchar",
    length: 20,
    name: "type",
    default: "text",
  })
  type: SpecificationType;

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

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
