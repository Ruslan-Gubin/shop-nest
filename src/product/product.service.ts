import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  create(createProductDto: CreateProductDto) {
    const product = this.productRepository.save(createProductDto);
    return product;
  }

  async findAll(page: string, limit: string, search: string) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    return await this.productRepository.find({
      skip,
      take: Number.parseInt(limit),
      where: {
        name: search,
      },
      order: { id: 'DESC' },
    });
  }

  async getTotalCount() {
    return await this.productRepository.count();
  }

  findOne(id: number) {
    return this.productRepository.findOneBy({ id });
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return this.productRepository.update(id, {
      ...updateProductDto,
    });
  }

  remove(id: number) {
    return this.productRepository.delete(id);
  }
}
