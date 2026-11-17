import type { Repository } from 'typeorm';
import { ProductService } from '../product.service';
import type { Product } from '../entities/product.entity';

type MockFn = jest.Mock;

const createService = ({
  deleteProduct,
  findByParent,
  removePhoto,
}: {
  deleteProduct: MockFn;
  findByParent: MockFn;
  removePhoto: MockFn;
}) =>
  new ProductService(
    { delete: deleteProduct } as unknown as Repository<Product>,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {
      findByParent,
      remove: removePhoto,
    } as never,
    {} as never,
  );

describe('ProductService.remove', () => {
  it('удаляет фото товара и только затем сам товар', async () => {
    const calls: string[] = [];

    const deleteProduct = jest.fn(() => {
      calls.push('product.delete');
      return Promise.resolve({ affected: 1 });
    });
    const findByParent = jest.fn(() => {
      calls.push('photo.findByParent');
      return Promise.resolve([{ id: 10 }, { id: 11 }]);
    });
    const removePhoto = jest.fn((id: number) => {
      calls.push(`photo.remove:${id}`);
      return Promise.resolve(undefined);
    });

    const service = createService({ deleteProduct, findByParent, removePhoto });

    await service.remove(42);

    expect(findByParent).toHaveBeenCalledWith('product', 42);
    expect(removePhoto).toHaveBeenNthCalledWith(1, 10);
    expect(removePhoto).toHaveBeenNthCalledWith(2, 11);
    expect(deleteProduct).toHaveBeenCalledWith(42);
    expect(calls).toEqual([
      'photo.findByParent',
      'photo.remove:10',
      'photo.remove:11',
      'product.delete',
    ]);
  });

  it('удаляет товар, если фото у него нет', async () => {
    const deleteProduct = jest.fn().mockResolvedValue({ affected: 1 });
    const findByParent = jest.fn().mockResolvedValue([]);
    const removePhoto = jest.fn();

    const service = createService({ deleteProduct, findByParent, removePhoto });

    await service.remove(7);

    expect(removePhoto).not.toHaveBeenCalled();
    expect(deleteProduct).toHaveBeenCalledWith(7);
  });

  it('не удаляет товар, если удаление фото упало', async () => {
    const deleteProduct = jest.fn();
    const findByParent = jest.fn().mockResolvedValue([{ id: 5 }]);
    const removePhoto = jest.fn().mockRejectedValue('Не удалось удалить фото');

    const service = createService({ deleteProduct, findByParent, removePhoto });

    await expect(service.remove(3)).rejects.toBe('Не удалось удалить фото');
    expect(deleteProduct).not.toHaveBeenCalled();
  });
});
