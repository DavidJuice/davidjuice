import Tesseract from 'tesseract.js';

export interface OCRWorkerMessage {
  type: 'process';
  images: { id: string; name: string; data: ArrayBuffer }[];
}

export interface OCRWorkerResult {
  type: 'progress' | 'complete' | 'error';
  imageId?: string;
  imageName?: string;
  text?: string;
  confidence?: number;
  processed?: number;
  total?: number;
  results?: { id: string; name: string; text: string; confidence: number }[];
  error?: string;
}

let worker: Tesseract.Worker | null = null;

/**
 * HIPAA COMPLIANCE: All Tesseract.js assets MUST be loaded from local paths.
 * Without explicit langPath/corePath/workerPath, Tesseract.js defaults to
 * downloading from jsDelivr CDN and tessdata.projectnaptha.com — this would
 * leak user IP + timing metadata about PHI processing to third-party servers.
 *
 * All required files must be pre-bundled in /public/tesseract/:
 *   - worker.min.js    (from tesseract.js npm package)
 *   - tesseract-core-simd.wasm.js  (from tesseract.js-core npm package)
 *   - eng.traineddata  (from tessdata repository)
 */
async function getWorker(): Promise<Tesseract.Worker> {
  if (!worker) {
    worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/tesseract-core-simd.wasm.js',
      langPath: '/tesseract',
      cacheMethod: 'none',
    });
  }
  return worker;
}

self.onmessage = async (e: MessageEvent<OCRWorkerMessage>) => {
  const { images } = e.data;
  const results: { id: string; name: string; text: string; confidence: number }[] = [];

  try {
    const tesseractWorker = await getWorker();

    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      try {
        // Convert ArrayBuffer to Blob for Tesseract
        const blob = new Blob([img.data]);
        const imageUrl = URL.createObjectURL(blob);

        const result = await tesseractWorker.recognize(imageUrl);

        // HIPAA: Immediately revoke object URL to free image data from memory
        URL.revokeObjectURL(imageUrl);

        const text = result.data.text;
        const confidence = result.data.confidence;

        results.push({ id: img.id, name: img.name, text, confidence });

        const progressMsg: OCRWorkerResult = {
          type: 'progress',
          imageId: img.id,
          imageName: img.name,
          text,
          confidence,
          processed: i + 1,
          total: images.length,
        };
        self.postMessage(progressMsg);
      } catch {
        // Report failure for this image but continue with others
        // HIPAA: Do not log error details — may contain PHI file paths/names
        results.push({
          id: img.id,
          name: img.name,
          text: '',
          confidence: 0,
        });

        const progressMsg: OCRWorkerResult = {
          type: 'progress',
          imageId: img.id,
          imageName: img.name,
          text: '',
          confidence: 0,
          processed: i + 1,
          total: images.length,
        };
        self.postMessage(progressMsg);
      }
    }

    const completeMsg: OCRWorkerResult = {
      type: 'complete',
      results,
    };
    self.postMessage(completeMsg);
  } catch {
    // HIPAA: Generic error only — do not expose internal details
    const errorMsg: OCRWorkerResult = {
      type: 'error',
      error: 'OCR processing failed. Ensure Tesseract assets are available locally.',
    };
    self.postMessage(errorMsg);
  }
};
