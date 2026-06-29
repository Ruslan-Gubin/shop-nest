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

@Entity()
export class ProductReview {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @ManyToOne(() => Product, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", name: "create_user_id" })
  create_user_id: number;

  @Column({ type: "varchar", default: "", name: "text" })
  text: string;

  @Column({ type: "int", default: 0, name: "rating" })
  rating: number;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
