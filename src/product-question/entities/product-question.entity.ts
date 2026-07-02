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
export class ProductQuestion {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @ManyToOne(() => Product, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", nullable: true, name: "create_user_id" })
  create_user_id: number | null;

  @Column({ type: "varchar", length: 1000, name: "question" })
  question: string;

  @Column({ type: "varchar", length: 1000, default: "", name: "answer" })
  answer: string;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
