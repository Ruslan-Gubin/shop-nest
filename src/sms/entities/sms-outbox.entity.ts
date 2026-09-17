import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type SmsOutboxStatus = "pending" | "delivered" | "failed";

@Entity("sms_outbox")
export class SmsOutbox {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", name: "phone" })
  phone: string;

  @Column({ type: "varchar", name: "code_hash" })
  code_hash: string;

  @Column({ type: "varchar", name: "message_text" })
  message_text: string;

  @Column({ type: "varchar", default: "pending", name: "status" })
  status: SmsOutboxStatus;

  @Column({ type: "int", default: 0, name: "delivery_attempts" })
  delivery_attempts: number;

  @Column({ type: "int", default: 0, name: "verify_attempts" })
  verify_attempts: number;

  @Column({ type: "varchar", default: "", name: "sender_phone" })
  sender_phone: string;

  @Column({ type: "varchar", name: "device_id" })
  device_id: string;

  @CreateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
