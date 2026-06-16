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
import { PriceType } from "src/price-type/entities/price-type.entity";

@Entity()
export class ProductPrice {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @ManyToOne(() => Product, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", name: "product_id" })
  product_id: number;

  @ManyToOne(() => PriceType, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "price_type_id" })
  price_type: PriceType;

  @Column({ type: "int", name: "price_type_id" })
  price_type_id: number;

  @Column({ type: "int", default: 0, name: "price" })
  price: number;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null, name: "updated_at" })
  updated_at: Date | null;
}
