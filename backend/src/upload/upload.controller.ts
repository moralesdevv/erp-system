import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { UploadService } from './upload.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('File Upload')
@ApiBearerAuth()
@Controller('upload')
@UseGuards(RolesGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload a file (validated and secured)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const saved = this.uploadService.saveFile(file);

    await this.auditService.log({
      actorId: actor.id,
      action: 'FILE_UPLOAD',
      resource: 'uploads',
      resourceId: saved.filename,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      afterData: { filename: saved.filename, size: saved.size, mimeType: file.mimetype },
    });

    return {
      filename: saved.filename,
      size: saved.size,
      mimeType: file.mimetype,
    };
  }
}
