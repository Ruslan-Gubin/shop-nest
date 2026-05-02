import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PriceType } from "src/price-type/entities/price-type.entity";
import { PriceRange } from "src/price-range/entities/price-range.entity";

@Entity()
export class PriceFill {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @ManyToOne(() => PriceType, { onDelete: "CASCADE" })
  @JoinColumn({ name: "price_type_id" })
  price_type: PriceType;

  @Column({ type: "int", name: "price_type_id" })
  price_type_id: number;

  @ManyToOne(() => PriceRange, { onDelete: "CASCADE" })
  @JoinColumn({ name: "price_range_id" })
  price_range: PriceRange;

  @Column({ type: "int", name: "price_range_id" })
  price_range_id: number;

  @Column({ type: "int", default: 0, name: "percent" })
  percent: number;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null, name: "updated_at" })
  updated_at: Date | null;
}