import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join, resolve, sep } from "path";
import sharp, { type FitEnum } from "sharp";

type SaveImageOptions = {
  folder: string;
  width?: number;
  height?: number;
  fit?: keyof FitEnum;
  quality?: number;
  withoutEnlargement?: boolean;
};

@Injectable()
export class StorageService {
  private readonly uploadsRoot = join(process.cwd(), "uploads");

  async saveImage(file: Express.Multer.File, options: SaveImageOptions): Promise<string> {
    if (!file?.buffer) {
      throw "Файл не получен";
    }

    if (!options?.folder) {
      throw "Не указана папка для сохранения файла";
    }

    const targetDir = join(this.uploadsRoot, options.folder);
    await fs.mkdir(targetDir, { recursive: true });

    const fileName = `${randomUUID()}.jpg`;
    const filePath = join(targetDir, fileName);

    let pipeline = sharp(file.buffer).rotate();

    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.fit ?? "inside",
        withoutEnlargement: options.withoutEnlargement ?? true,
      });
    }

    const image = await pipeline
      .jpeg({ mozjpeg: true, quality: options.quality ?? 82 })
      .toBuffer()
      .catch((error) => {
        throw `Не удалось обработать изображение, ${error.message}`;
      });

    await fs.writeFile(filePath, image).catch((error) => {
      throw `Не удалось сохранить файл, ${error.message}`;
    });

    return `uploads/${options.folder}/${fileName}`;
  }

  async deleteByUrl(url?: string | null): Promise<void> {
    const filePath = typeof url === "string" ? resolve(process.cwd(), url) : null;

    if (
      typeof url === "string" &&
      filePath &&
      url.includes("uploads") &&
      filePath.startsWith(resolve(this.uploadsRoot) + sep) &&
      (await this.isExistingFile(filePath))
    ) {
      await fs.unlink(filePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw `Не удалось удалить файл, ${error.message}`;
        }
      });
    }
  }

  private async isExistingFile(filePath: string): Promise<boolean> {
    const stats = await fs.stat(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return null;
      }

      throw `Не удалось проверить файл, ${error.message}`;
    });

    return stats?.isFile() ?? false;
  }
}
