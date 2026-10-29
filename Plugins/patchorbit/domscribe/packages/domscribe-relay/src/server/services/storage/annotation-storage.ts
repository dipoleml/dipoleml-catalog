/**
 * AnnotationStorageProvider - Pluggable storage abstraction for annotations.
 *
 * Decouples AnnotationService domain logic from the underlying storage
 * mechanism (filesystem, in-memory, database, etc.).
 */
import type { Annotation, AnnotationStatus } from '@domscribe/core';

export interface AnnotationStorageProvider {
  /** Create status directories or equivalent storage structure. */
  initialize(statuses: readonly AnnotationStatus[]): Promise<void>;

  /** Read a single annotation by ID from a specific status bucket. */
  read(id: string, status: AnnotationStatus): Promise<Annotation | null>;

  /** Write (create or overwrite) an annotation to its status bucket. */
  write(annotation: Annotation): Promise<void>;

  /** Remove an annotation from a specific status bucket. Returns true if it existed. */
  remove(id: string, status: AnnotationStatus): Promise<boolean>;

  /** List all annotations in a given status bucket. */
  listByStatus(status: AnnotationStatus): Promise<Annotation[]>;

  /** Count annotations in a given status bucket. */
  countByStatus(status: AnnotationStatus): Promise<number>;
}
