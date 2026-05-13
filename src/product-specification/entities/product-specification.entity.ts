import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Product } from "src/product/entities/product.entity";
import { Specification } from "src/specifications/entities/specification.entity";

@Entity()
export class ProductSpecification {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", name: "product_id" })
  product_id: number;

  @ManyToOne(() => Specification, { onDelete: "CASCADE" })
  @JoinColumn({ name: "specification_id" })
  specification: Specification;

  @Column({ type: "int", name: "specification_id" })
  specification_id: number;

  @Column({ type: "varchar", length: 255, name: "value" })
  value: string;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null, name: "updated_at" })
  updated_at: Date | null;
}