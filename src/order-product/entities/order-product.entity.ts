import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Order } from "src/orders/entities/order.entity";

@Entity()
export class OrderProduct {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @Column({ type: "int", name: "order_id" })
  order_id: number;

  @Column({ type: "varchar", default: "", name: "product_name" })
  product_name: string;

  @Column({ type: "varchar", default: "", name: "product_code" })
  product_code: string;

  @Column({ type: "varchar", default: "", name: "product_description" })
  product_description: string;

  @Column({ type: "varchar", default: "", name: "product_image" })
  product_image: string;

  @Column({ type: "varchar", default: "", name: "product_country" })
  product_country: string;

  @Column({ type: "varchar", default: "", name: "product_type" })
  product_type: string;

  @Column({ type: "varchar", default: "", name: "product_equipment" })
  product_equipment: string;

  @Column({ type: "int", nullable: true, default: null, name: "product_weight" })
  product_weight: number | null;

  @Column({ type: "int", nullable: true, default: null, name: "product_height" })
  product_height: number | null;

  @Column({ type: "int", nullable: true, default: null, name: "product_length" })
  product_length: number | null;

  @Column({ type: "int", nullable: true, default: null, name: "product_width" })
  product_width: number | null;

  @Column({ type: "int", default: 1, name: "quantity" })
  quantity: number;

  @Column({ type: "int", default: 0, name: "price" })
  price: number;
}