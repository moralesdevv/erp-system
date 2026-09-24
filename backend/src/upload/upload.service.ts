import {
  Injectable,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.sh', '.bash', '.cmd', '.bat', '.ps1', '.php',
  '.py', '.rb', '.pl', '.js', '.ts', '.mjs', '.cjs',
  '.dll', '.so', '.dylib', '.jar', '.war', '.ear',
  '.svg', // SVG can contain XSS
]);

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes: number;
  private readonly allowedMimeTypes: string[];

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('upload.dir', './uploads');
    this.maxFileSizeBytes =
      this.configService.get<number>('upload.maxFileSizeMb', 10) * 1024 * 1024;
    this.allowedMimeTypes = this.configService.get<string[]>('upload.allowedMimeTypes', []);

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  validateFile(file: Express.Multer.File): void {
    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File too large. Maximum size is ${this.maxFileSizeBytes / 1024 / 1024}MB`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `File type '${file.mimetype}' is not allowed`,
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`File extension '${ext}' is not allowed`);
    }

    // Validate MIME type matches extension
    this.validateMimeExtensionMatch(file.mimetype, ext);
  }

  saveFile(file: Express.Multer.File): { filename: string; path: string; size: number } {
    this.validateFile(file);

    // Generate safe filename (UUID-based, strip original name to prevent path traversal)
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFilename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.uploadDir, safeFilename);

    fs.writeFileSync(filePath, file.buffer);

    return {
      filename: safeFilename,
      path: filePath,
      size: file.size,
    };
  }

  deleteFile(filename: string): void {
    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.uploadDir, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private validateMimeExtensionMatch(mimeType: string, ext: string): void {
    const mimeExtMap: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
    };

    const validExtensions = mimeExtMap[mimeType];
    if (validExtensions && !validExtensions.includes(ext)) {
      throw new BadRequestException('File extension does not match MIME type');
    }
  }
}
