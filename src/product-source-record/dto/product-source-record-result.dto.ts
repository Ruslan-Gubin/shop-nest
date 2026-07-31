export class SeoDto {
  seo_title: string;
  seo_description: string;
  slug: string;
  og_title: string;
  og_description: string;
  og_type: string;
  keywords: string;
}

export class SpecificationDto {
  name: string;
  value: string;
}

export class ProductSourceRecordResultDto {
  names: string[];
  clearName: string;
  seo: SeoDto | null;
  specifications: SpecificationDto[] | null;
  photos: string[];
}
