import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const SMS_ERROR_STATUSES: SmsOutboxStatus[] = [
  'failed',
  'failed_no_balance',
  'failed_gateway',
];

export type SmsOutboxStatus =
  | 'pending'
  | 'in_work'
  | 'delivered'
  | 'failed'
  | 'failed_no_balance'
  | 'failed_invalid_number'
  | 'failed_gateway';

@Entity('sms_outbox')
export class SmsOutbox {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'varchar', name: 'phone' })
  phone: string;

  @Column({ type: 'varchar', name: 'code_hash' })
  code_hash: string;

  @Column({ type: 'varchar', name: 'message_text' })
  message_text: string;

  @Column({ type: 'varchar', default: 'pending', name: 'status' })
  status: SmsOutboxStatus;

  @Column({ type: 'int', default: 0, name: 'verify_attempts' })
  verify_attempts: number;

  @Column('text', { array: true, default: '{}', name: 'sender_phones' })
  sender_phones: string[];

  @Column({ type: 'varchar', name: 'device_id' })
  device_id: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
