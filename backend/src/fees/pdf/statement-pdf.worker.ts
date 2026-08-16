import { parentPort } from 'worker_threads';
import { renderStatementPdf, type StatementPdfData } from './statement-pdf';

parentPort?.on('message', async (msg: { data: StatementPdfData }) => {
  try {
    const buffer = await renderStatementPdf(msg.data);
    parentPort?.postMessage({ ok: true, buffer });
  } catch (error) {
    parentPort?.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
