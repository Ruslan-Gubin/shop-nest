import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Address {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column({ type: "varchar", default: "pickup", name: "type" })
  type: "pickup" | "courier";

  @Column({ type: "varchar", default: "", name: "name" })
  name: string;

  @Column({ type: "varchar", default: "", name: "place" })
  place: string;

  @Column({ type: "float8", default: 0, name: "lng" })
  lng: number;

  @Column({ type: "float8", default: 0, name: "lat" })
  lat: number;

  @Column({ type: "varchar", default: "", name: "entrance" })
  entrance: string;

  @Column({ type: "varchar", default: "", name: "flat" })
  flat: string;

  @Column({ type: "varchar", default: "", name: "floor" })
  floor: string;

  @Column({ type: "varchar", default: "", name: "intercom" })
  intercom: string;
}
