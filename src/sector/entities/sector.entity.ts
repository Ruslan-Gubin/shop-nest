import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Warehouse } from 'src/warehouse/entities/warehouse.entity';

@Entity()
export class Sector {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'varchar', default: '', name: 'color' })
  color: string;

  @Column({ type: 'int', default: 0, name: 'price' })
  price: number;

  @Column({ type: 'jsonb', default: [], name: 'coordinates' })
  coordinates: number[][];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null })
  updated_at: Date | null;
}
