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

@Entity()
export class OrderProduct {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "int", default: 0, name: "product_id" })
  product_id: number;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @Column({ type: "int", name: "order_id" })
  order_id: number;

  @Column({ type: "varchar", default: "", name: "name" })
  name: string;

  @Column({ type: "varchar", default: "", name: "code" })
  code: string;

  @Column({ type: "varchar", default: "", name: "description" })
  description: string;

  @Column({ type: "varchar", default: "", name: "country" })
  country: string;

  @Column({ type: "varchar", default: "", name: "product_type" })
  product_type: string;

  @Column({ type: "varchar", default: "", name: "equipment" })
  equipment: string;

  @Column({ type: "int", nullable: true, default: null, name: "weight" })
  weight: number | null;

  @Column({ type: "int", nullable: true, default: null, name: "height" })
  height: number | null;

  @Column({ type: "int", nullable: true, default: null, name: "length" })
  length: number | null;

  @Column({ type: "int", nullable: true, default: null, name: "width" })
  width: number | null;

  @Column({ type: "int", default: 1, name: "quantity" })
  quantity: number;

  @Column({ type: "int", default: 0, name: "price" })
  price: number;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}

