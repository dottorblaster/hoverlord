exports.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.withRetry = (interval = 500, tries = 10) => async (fn) => {
  let lastError;
  for (let attempts = 0; attempts < tries; attempts++) {
    try {
      await fn();
      console.log('Retry OK!');
      return;
    } catch (error) {
      lastError = error;
      await exports.delay(interval);
    }
  }

  throw lastError;
};
