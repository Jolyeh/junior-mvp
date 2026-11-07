import { BadRequestException } from '@nestjs/common';
import * as yauzl from 'yauzl';

// Contrôle le contenu réellement décompressé avant de confier le fichier à ExcelJS.
export function validateXlsxArchive(buffer: Buffer): Promise<void> {
 return new Promise((resolve, reject) => {
  const fail = () => reject(new BadRequestException('Fichier Excel invalide ou trop volumineux après décompression.'));
  yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (err, zip) => {
   if (err || !zip) { fail(); return; }
   let total = 0, entries = 0, finished = false;
   const abort = () => { if (!finished) { finished = true; zip.close(); fail(); } };
   zip.on('error', abort);
   zip.on('end', () => { if (!finished) { finished = true; resolve(); } });
   zip.on('entry', entry => {
    entries++;
    if (entries > 2500 || entry.uncompressedSize > 20 * 1024 * 1024 || total + entry.uncompressedSize > 50 * 1024 * 1024 || entry.fileName.includes('..') || entry.fileName.startsWith('/')) { abort(); return; }
    if (/\/$/.test(entry.fileName)) { zip.readEntry(); return; }
    zip.openReadStream(entry, (streamError, stream) => {
     if (streamError || !stream) { abort(); return; }
     stream.on('error', abort);
     stream.on('data', (chunk: Buffer) => { total += chunk.length; if (total > 50 * 1024 * 1024) { stream.destroy(); abort(); } });
     stream.on('end', () => { if (!finished) zip.readEntry(); });
    });
   });
   zip.readEntry();
  });
 });
}
