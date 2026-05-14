import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Warehouse {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", default: "", name: "name" })
  name: string;

  @Column({ type: "varchar", default: "", name: "address" })
  address: string;

  @Column({ type: "varchar", default: "", name: "area" })
  area: string;

  @Column({ type: "varchar", default: "", name: "city" })
  city: string;

  @Column({ type: "varchar", default: "", name: "street" })
  street: string;

  @Column({ type: "varchar", default: "", name: "house" })
  house: string;

  @Column({ type: "varchar", default: "", name: "index" })
  index: string;

  @Column({ type: "varchar", default: "", name: "office" })
  office: string;

  @Column({ type: "int", nullable: true, default: null, name: "create_user_id" })
  create_user_id: number;

  @Column({ type: "varchar", default: "", name: "description" })
  description: string;

  @Column({ type: "boolean", default: true, name: "is_active" })
  is_active: boolean;

  @Column({ type: "boolean", default: false, name: "default_warehouse" })
  default_warehouse: boolean;

  @Column({ type: "boolean", default: true, name: "is_public" })
  is_public: boolean;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}