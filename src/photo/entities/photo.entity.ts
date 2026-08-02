import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "photo" })
@Index(["parent_type", "parent_id"])
export class Photo {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", name: "url" })
  url: string;

  @Column({ type: "int", default: 1, name: "position" })
  position: number;

  @Column({ type: "varchar", default: "product", name: "parent_type" })
  parent_type: string;

  @Column({ type: "int", name: "parent_id" })
  parent_id: number;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null, name: "updated_at" })
  updated_at: Date | null;
}
