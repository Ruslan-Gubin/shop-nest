import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'varchar', default: '', name: 'name' })
  name: string;

  @Column({ type: 'varchar', default: '', name: 'title' })
  title: string;

  @Column({ type: 'int', default: 0, name: 'price' })
  price: string;

  @Column({ type: 'int', default: 0, name: 'count' })
  count: string;

  @Column({ type: 'varchar', default: '', name: 'code' })
  code: string;

  @Column({ type: 'int', default: 0, name: 'old_price' })
  old_price: number;

  @Column({ type: 'int', default: 0, name: 'discount' })
  discount: string;

  @Column({ type: 'varchar', default: '', name: 'description' })
  description: string;

  @Column({ type: 'boolean', default: false, name: 'on_save' })
  on_save: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_stock' })
  is_stock: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_hit' })
  is_hit: boolean;

  @Column({ type: 'int', default: 0, name: 'rating' })
  rating: number;

  @Column({ type: 'varchar', default: '', name: 'unit' })
  unit: string;

  @Column({ type: 'varchar', default: '', name: 'color' })
  color: string;

  @Column({ type: 'int', default: null, name: 'department_id' })
  department_id: number | null;

  // @ManyToOne(() => Category)
  // category: Category;
  //
  // @ManyToOne(() => Brand)
  // brand: Brand;
  //
  // @ManyToOne(() => Department)
  // department: Department;
  @Column({ type: 'int', default: 0, name: 'category_id' })
  category_id: number;

  @Column({ type: 'int', default: 0, name: 'brand_id' })
  brand_id: number;

  @Column({ type: 'varchar', default: '', name: 'options' })
  options: string;

  @Column({ type: 'int', default: 0, name: 'buy_count' })
  buy_count: number;

  @Column({ type: 'int', default: 0, name: 'views' })
  views: number;

  @Column({ type: 'varchar', default: '', name: 'main_photo' })
  main_photo: string;

  @Column({ type: 'varchar', default: '', name: 'additional_photos' })
  additional_photos: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true, default: null })
  updated_at: Date | null;
}
