import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({
    type: "varchar",
    default: "",
    name: "name",
    nullable: false,
  })
  name: string;

  @Column({
    type: "varchar",
    default: "",
    name: "phone",
    nullable: false,
  })
  phone: string;

  @Column({
    type: "varchar",
    default: "",
    name: "email",
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({ type: "varchar", default: "", name: "refresh" })
  refresh: string;

  @Column({ type: "varchar", default: "", name: "password" })
  password: string;

  @Column({ type: "int", default: null, name: "department_id" })
  department_id: number | null;

  @Column({ type: "varchar", default: "user", name: "role" })
  role: string;

  @Column({ type: "varchar", default: "", name: "photo" })
  photo: string;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
