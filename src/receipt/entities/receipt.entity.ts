import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type ReceiptProduct = {
  product_id: number;
  stocks: Record<string, number>;
  prices: Record<string, number>;
};

@Entity()
export class Receipt {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "int", nullable: true, default: null, name: "user_id" })
  user_id: number;

  @Column({ type: "jsonb", default: [], name: "products" })
  products: ReceiptProduct[];

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
