import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type OrderStatus =
  | "new"
  | "cancelled_new"
  | "processing"
  | "cancelled_assembly"
  | "ready"
  | "in_delivery"
  | "cancelled_delivery"
  | "completed"
  | "cancelled_customer";

@Entity()
export class Order {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "int", name: "create_user_id" })
  create_user_id: number;

  @Column({ type: "varchar", default: "", name: "order_number" })
  order_number: string;

  @Column({ type: "varchar", default: "", name: "comment" })
  comment: string;

  @Column({ type: "varchar", default: "new", name: "status" })
  status: OrderStatus;

  @Column({ type: "varchar", default: "", name: "rejected_reason" })
  rejected_reason: string;

  @Column({ type: "int", default: 0, name: "discount" })
  discount: number;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}