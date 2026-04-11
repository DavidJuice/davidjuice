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

async function getWorker(): Promise<Tesseract.Worker> {
  if (!worker) {
    worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
      // Use local assets if available, fall back to CDN
      workerPath: '/tesseract/worker.min.js',
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

        URL.revokeObjectURL(imageUrl);

        const text = result.data.text;
        const confidence = result.data.confidence;

        results.push({ id: img.id, name: img.name, text, confidence });

        // Report progress
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
      } catch (err) {
        // Report error for this image but continue with others
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
  } catch (err) {
    const errorMsg: OCRWorkerResult = {
      type: 'error',
      error: err instanceof Error ? err.message : 'OCR processing failed',
    };
    self.postMessage(errorMsg);
  }
};
