import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Order } from "src/orders/entities/order.entity";

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

@Entity()
export class Payment {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @Column({ type: "int", default: 0, name: "amount" })
  amount: number;

  @Column({ type: "varchar", default: "pending", name: "status" })
  status: PaymentStatus;

  @Column({ type: "varchar", default: "", name: "provider" })
  provider: string;

  @Column({ type: "varchar", default: "", name: "qr_id" })
  qr_id: string;

  @Column({ type: "varchar", default: "", name: "qr_data" })
  qr_data: string;

  @Column({ type: "varchar", default: "", name: "qr_psb_id" })
  qr_psb_id: string;

  @Column({ type: "varchar", default: "", name: "sbp_tran_id" })
  sbp_tran_id: string;

  @Column({ type: "varchar", default: "", name: "error_message" })
  error_message: string;

  @Column({ type: "timestamp", nullable: true, default: null, name: "paid_at" })
  paid_at: Date | null;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
