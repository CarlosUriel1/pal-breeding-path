let requestCounter = 0;

export function requestCollectionPlan(input, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Planning cancelled.', 'AbortError'));
      return;
    }

    const requestId = ++requestCounter;
    const worker = new Worker(new URL('./planner.worker.js', import.meta.url), { type: 'module' });
    const finish = (callback, value) => {
      signal?.removeEventListener('abort', cancel);
      worker.terminate();
      callback(value);
    };
    const cancel = () => finish(reject, new DOMException('Planning cancelled.', 'AbortError'));

    worker.onmessage = ({ data }) => {
      if (data?.requestId !== requestId) return;
      if (data.type === 'progress') {
        onProgress?.(data.progress);
        return;
      }
      if (data.type === 'result') finish(resolve, data.result);
      else if (data.type === 'error') finish(reject, new Error(data.message || 'Collection planner failed.'));
    };
    worker.onerror = (event) => finish(reject, new Error(event?.message || 'The collection planner stopped unexpectedly.'));
    worker.onmessageerror = () => finish(reject, new Error('The collection planner returned an unreadable result.'));
    signal?.addEventListener('abort', cancel, { once: true });
    worker.postMessage({ type: 'plan', requestId, input });
  });
}
