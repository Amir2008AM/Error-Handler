/**
 * Global Upload Manager
 *
 * Central registry for all upload sources. This is the single source of truth
 * for upload architecture. Every tool in the project receives files through
 * this system automatically via the shared UploadDropzone component.
 *
 * SUPPORTED SOURCES
 *  - local    : Drag & drop or device file picker (always available)
 *  - google-drive : Google Drive Picker API (requires NEXT_PUBLIC_GOOGLE_* env vars)
 *
 * ADDING A NEW SOURCE (e.g. Dropbox)
 *  1. Add the source key below
 *  2. Create lib/upload/<source>.ts with the picker logic
 *  3. Add a button in components/upload-dropzone.tsx
 *  ➡ Every existing and future tool automatically gets the new source.
 *
 * ADDING A NEW TOOL
 *  1. Use <UploadDropzone onFilesSelected={...} /> in the tool component
 *  ➡ The tool automatically inherits all current and future upload sources.
 */

export type UploadSource = 'local' | 'google-drive' | 'dropbox'

export interface NormalizedFile {
  file: File
  source: UploadSource
}

export function wrapFiles(files: File[], source: UploadSource): NormalizedFile[] {
  return files.map((file) => ({ file, source }))
}

export function unwrapFiles(normalized: NormalizedFile[]): File[] {
  return normalized.map((n) => n.file)
}
