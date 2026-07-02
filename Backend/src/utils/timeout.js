function withTimeout(promise, timeoutMs = 10000, message = "Request timeout") {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}

module.exports = { withTimeout };
