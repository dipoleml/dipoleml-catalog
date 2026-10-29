/**
 * InMemoryAnnotationStorage - In-memory implementation of AnnotationStorageProvider.
 *
 * Useful for unit tests where disk I/O is unnecessary.
 */
import type { Annotation, AnnotationStatus } from '@domscribe/core';
import type { AnnotationStorageProvider } from './annotation-storage.js';

export class InMemoryAnnotationStorage implements AnnotationStorageProvider {
  private readonly buckets = new Map<
    AnnotationStatus,
    Map<string, Annotation>
  >();

  async initialize(statuses: readonly AnnotationStatus[]): Promise<void> {
    for (const status of statuses) {
      if (!this.buckets.has(status)) {
        this.buckets.set(status, new Map());
      }
    }
  }

  async read(id: string, status: AnnotationStatus): Promise<Annotation | null> {
    return this.buckets.get(status)?.get(id) ?? null;
  }

  async write(annotation: Annotation): Promise<void> {
    const bucket = this.buckets.get(annotation.metadata.status);
    if (!bucket) {
      throw new Error(
        `Storage not initialized for status: ${annotation.metadata.status}`,
      );
    }
    // Deep clone to prevent mutation of stored data
    bucket.set(
      annotation.metadata.id,
      JSON.parse(JSON.stringify(annotation)) as Annotation,
    );
  }

  async remove(id: string, status: AnnotationStatus): Promise<boolean> {
    return this.buckets.get(status)?.delete(id) ?? false;
  }

  async listByStatus(status: AnnotationStatus): Promise<Annotation[]> {
    const bucket = this.buckets.get(status);
    if (!bucket) {
      return [];
    }
    return [...bucket.values()];
  }

  async countByStatus(status: AnnotationStatus): Promise<number> {
    return this.buckets.get(status)?.size ?? 0;
  }
}
