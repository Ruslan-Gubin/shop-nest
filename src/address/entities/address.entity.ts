import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Order } from "src/orders/entities/order.entity";
import { Warehouse } from "src/warehouse/entities/warehouse.entity";

@Entity()
export class Address {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", default: "pickup", name: "type" })
  type: "pickup" | "courier";

  @Column({ type: "varchar", default: "", name: "name" })
  name: string;

  @Column({ type: "varchar", default: "", name: "place" })
  place: string;

  @Column({ type: "float8", default: 0, name: "lng" })
  lng: number;

  @Column({ type: "float8", default: 0, name: "lat" })
  lat: number;

  @Column({ type: "varchar", default: "", name: "entrance" })
  entrance: string;

  @Column({ type: "varchar", default: "", name: "flat" })
  flat: string;

  @Column({ type: "varchar", default: "", name: "floor" })
  floor: string;

  @Column({ type: "varchar", default: "", name: "intercom" })
  intercom: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @Column({ type: "int", nullable: true, name: "order_id" })
  order_id: number | null;

  @ManyToOne(() => Warehouse, { onDelete: "CASCADE" })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @Column({ type: "int", nullable: true, name: "warehouse_id" })
  warehouse_id: number | null;
}
