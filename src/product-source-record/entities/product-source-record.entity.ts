import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "product_source_record" })
export class ProductSourceRecord {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", unique: true, name: "value" })
  value: string;

  @Column({ type: "varchar", default: "", name: "clear_name" })
  clear_name: string;

  @Column({ type: "jsonb", default: [], name: "source_names" })
  source_names: string[];

  @Column({ type: "varchar", default: "", name: "error_message" })
  error_message: string;

  @Column({ type: "jsonb", nullable: true, name: "product" })
  product: object | null;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updatedAt: Date | null;
}
