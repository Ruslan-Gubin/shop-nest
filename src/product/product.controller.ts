import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { strict } from 'assert';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post('create')
  async create(@Body() createProductDto: CreateProductDto) {
    try {
      const product = await this.productService.create(createProductDto);

      return {
        status: 'success',
        data: product,
        message: 'Товар успешно добавлен',
      };
    } catch (error) {
      return {
        status: 'error',
        body: null,
        message: `Ошибка на сервере: ${error}`,
      };
    }
  }

  @Get('products')
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    try {
      const products = await this.productService.findAll(page, limit, search);
      const totalCount = await this.productService.getTotalCount();
      return {
        data: { products, totalCount, paginationPage: page },
        message: '',
        status: 'success',
      };
    } catch (error) {
      return {
        status: 'error',
        body: null,
        message: `Ошибка на сервере: ${error}`,
      };
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    try {
      const product = await this.productService.update(+id, updateProductDto);
      return {
        status: 'success',
        data: product,
        message: 'Товар успешно изменен',
      };
    } catch (error) {
      return {
        status: 'error',
        body: null,
        message: `Ошибка на сервере: ${error}`,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const isRemove = await this.productService.remove(+id);
      return {
        status: 'success',
        data: isRemove,
        message: 'Товар успешно удален',
      };
    } catch (error) {
      return {
        status: 'error',
        body: null,
        message: `Ошибка на сервере: ${error}`,
      };
    }
  }
}
