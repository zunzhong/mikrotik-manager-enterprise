export class RestoreValidationService {
  public validateFileName(fileName: string) {
    const isBinary = fileName.endsWith('.backup');
    const isExport = fileName.endsWith('.rsc');

    return {
      valid: isBinary || isExport,
      type: isBinary ? 'binary' : isExport ? 'export' : 'unknown',
      fileName,
      warnings:
        isBinary || isExport
          ? []
          : ['Unsupported backup file extension. Expected .backup or .rsc.'],
    };
  }

  public validateMetadata(input: { type: string; fileName: string; status: string }) {
    const file = this.validateFileName(input.fileName);

    return {
      valid: file.valid && input.status === 'completed',
      file,
      status: input.status,
      type: input.type,
      warnings: [
        ...file.warnings,
        ...(input.status !== 'completed' ? ['Backup is not completed.'] : []),
      ],
    };
  }
}

export const restoreValidationService = new RestoreValidationService();
