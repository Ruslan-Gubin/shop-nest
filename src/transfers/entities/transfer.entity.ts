import { Address } from "src/address/entities/address.entity";
import { Warehouse } from "src/warehouse/entities/warehouse.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Transfer {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", default: "transfer", name: "type" })
  type: "transfer" | "delivery";

  @Column({ type: "varchar", default: "processing", name: "status" })
  status: "processing" | "completed" | "rejected";

  @Column({ type: "int", nullable: true, default: null, name: "order_id" })
  order_id: number | null;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: "from_warehouse_id" })
  from_warehouse: Warehouse | null;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: "to_warehouse_id" })
  to_warehouse: Warehouse | null;

  @OneToOne(() => Address, { cascade: true, eager: false })
  @JoinColumn({ name: "to_address_id" })
  to_address: Address | null;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
