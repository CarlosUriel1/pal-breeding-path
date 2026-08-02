import { findCollectionPlan } from './collectionPlanner.js';

self.onmessage = ({ data }) => {
  if (data?.type !== 'plan') return;
  const { requestId, input } = data;
  try {
    const result = findCollectionPlan({
      ...input,
      onProgress: (progress) => self.postMessage({ type: 'progress', requestId, progress }),
    });
    self.postMessage({ type: 'result', requestId, result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      message: error instanceof Error ? error.message : 'Collection planner failed.',
    });
  }
};

