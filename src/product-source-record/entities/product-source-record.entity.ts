import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "product_source_record" })
export class ProductSourceRecord {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", unique: true, name: "value" })
  value: string;

  @Column({ type: "varchar", default: "", name: "name" })
  name: string;

  @Column({ type: "varchar", default: "", name: "code" })
  code: string;

  @Column({ type: "varchar", default: "", name: "brand_name" })
  brand_name: string;

  @Column({ type: "varchar", default: "", name: "description" })
  description: string;

  @Column({ type: "varchar", default: "", name: "country" })
  country: string;

  @Column({ type: "varchar", default: "", name: "product_type" })
  product_type: string;

  @Column({ type: "varchar", default: "", name: "equipment" })
  equipment: string;

  @Column({ type: "float", nullable: true, default: null, name: "weight" })
  weight: number | null;

  @Column({ type: "float", nullable: true, default: null, name: "height" })
  height: number | null;

  @Column({ type: "float", nullable: true, default: null, name: "length" })
  length: number | null;

  @Column({ type: "float", nullable: true, default: null, name: "width" })
  width: number | null;

  @Column({ type: "varchar", default: "", name: "seo_title" })
  seo_title: string;

  @Column({ type: "varchar", default: "", name: "seo_description" })
  seo_description: string;

  @Column({ type: "varchar", default: "", name: "slug" })
  slug: string;

  @Column({ type: "varchar", default: "", name: "og_title" })
  og_title: string;

  @Column({ type: "varchar", default: "", name: "og_description" })
  og_description: string;

  @Column({ type: "varchar", default: "", name: "og_type" })
  og_type: string;

  @Column({ type: "varchar", default: "", name: "keywords" })
  keywords: string;

  @Column({ type: "int", nullable: true, default: null, name: "price" })
  price: number | null;

  @Column({ type: "jsonb", default: [], name: "specifications" })
  specifications: { name: string; value: string }[];

  @Column({ type: "jsonb", nullable: true, default: null, name: "categories" })
  categories: {
    category_id: number | null;
    create_categories: { name: string; parent_id: number | null }[];
  } | null;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updatedAt: Date | null;
}
