import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Product } from "../../product/entities/product.entity";
import { Warehouse } from "../../warehouse/entities/warehouse.entity";

@Entity()
export class ProductStock {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @ManyToOne(() => Warehouse, { onDelete: "SET NULL", eager: false })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @ManyToOne(() => Product, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", default: 0, name: "quantity" })
  quantity: number;

  @Column({ type: "int", default: 0, name: "reserved" })
  reserved: number;

  @Column({ type: "boolean", default: false, name: "in_stock" })
  in_stock: boolean;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
