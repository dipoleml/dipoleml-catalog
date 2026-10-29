/**
 * FileAnnotationStorage - Disk-based implementation of AnnotationStorageProvider.
 *
 * Stores annotations as JSON files organized by status:
 *   <baseDir>/{queued,processing,processed,failed,archived}/<id>.json
 */
import type { Annotation, AnnotationStatus } from '@domscribe/core';
import { migrateAnnotation } from '@domscribe/core';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import path from 'path';
import type { AnnotationStorageProvider } from './annotation-storage.js';

export class FileAnnotationStorage implements AnnotationStorageProvider {
  constructor(private readonly baseDir: string) {}

  async initialize(statuses: readonly AnnotationStatus[]): Promise<void> {
    for (const status of statuses) {
      const statusDir = path.join(this.baseDir, status);
      if (!existsSync(statusDir)) {
        mkdirSync(statusDir, { recursive: true });
      }
    }
  }

  async read(id: string, status: AnnotationStatus): Promise<Annotation | null> {
    const filePath = this.getFilePath(id, status);
    if (!existsSync(filePath)) {
      return null;
    }
    const content = readFileSync(filePath, 'utf-8');
    return migrateAnnotation(JSON.parse(content));
  }

  async write(annotation: Annotation): Promise<void> {
    const filePath = this.getFilePath(
      annotation.metadata.id,
      annotation.metadata.status,
    );
    writeFileSync(filePath, JSON.stringify(annotation, null, 2));
  }

  async remove(id: string, status: AnnotationStatus): Promise<boolean> {
    const filePath = this.getFilePath(id, status);
    if (!existsSync(filePath)) {
      return false;
    }
    unlinkSync(filePath);
    return true;
  }

  async listByStatus(status: AnnotationStatus): Promise<Annotation[]> {
    const statusDir = path.join(this.baseDir, status);
    if (!existsSync(statusDir)) {
      return [];
    }

    const files = readdirSync(statusDir).filter((f) => f.endsWith('.json'));
    return files.map((file) => {
      const content = readFileSync(path.join(statusDir, file), 'utf-8');
      return migrateAnnotation(JSON.parse(content));
    });
  }

  async countByStatus(status: AnnotationStatus): Promise<number> {
    const statusDir = path.join(this.baseDir, status);
    if (!existsSync(statusDir)) {
      return 0;
    }
    return readdirSync(statusDir).filter((f) => f.endsWith('.json')).length;
  }

  private getFilePath(id: string, status: AnnotationStatus): string {
    return path.join(this.baseDir, status, `${id}.json`);
  }
}
