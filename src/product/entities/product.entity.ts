import { ProductPrice } from "src/product-price/entities/product-price.entity";
import { ProductStock } from "src/product-stock/entities/product-stock.entity";
import { Photo } from "src/photo/entities/photo.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Product {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", default: "", name: "name" })
  name: string;

  @Column({ type: "varchar", default: "", name: "code" })
  code: string;

  @Column({ type: "int", nullable: true, default: null, name: "brand_id" })
  brand_id: number;

  @Column({ type: "varchar", default: "", name: "brand_name" })
  brand_name: string;

  @Column({ type: "int", nullable: true, default: null, name: "category_id" })
  category_id: number;

  @Column({ type: "varchar", default: "", name: "description" })
  description: string;

  @Column({ type: "varchar", default: "", name: "country" })
  country: string;

  @Column({ type: "varchar", default: "", name: "product_type" })
  product_type: string;

  @Column({ type: "varchar", default: "", name: "equipment" })
  equipment: string;

  @Column({ type: "int", nullable: true, default: null, name: "weight" })
  weight: number;

  @Column({ type: "int", nullable: true, default: null, name: "height" })
  height: number;

  @Column({ type: "int", nullable: true, default: null, name: "length" })
  length: number;

  @Column({ type: "int", nullable: true, default: null, name: "width" })
  width: number;

  @Column({ type: "int", nullable: true, default: null, name: "purchase_price" })
  purchase_price: number;

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

  @Column({ type: "int", default: 0, name: "available" })
  available: number;

  @Column({ type: "boolean", default: false, name: "accounting" })
  accounting: boolean;

  @Column({ type: "jsonb", default: [], name: "price_list" })
  price_list: { price: number; minQuantity: number }[];

  @Column({ type: "int", default: 0, name: "views" })
  views: number;

  @Column({ type: "float", default: 0, name: "rating" })
  rating: number;

  @Column({ type: "int", default: 0, name: "review_count" })
  review_count: number;

  @OneToMany(() => ProductStock, (productStock) => productStock.product)
  stocks: ProductStock[];

  @OneToMany(() => ProductPrice, (productPrice) => productPrice.product)
  prices: ProductPrice[];

  photos: Photo[];

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
  updated_at: Date | null;
}
