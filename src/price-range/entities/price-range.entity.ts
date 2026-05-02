import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class PriceRange {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "int", default: 0, name: "price_from" })
  price_from: number;

  @Column({ type: "int", default: 0, name: "price_to" })
  price_to: number;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null, name: "updated_at" })
  updated_at: Date | null;
}

