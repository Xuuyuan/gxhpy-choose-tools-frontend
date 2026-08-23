export const DEFAULT_COURSE_REQUEST_TIMEOUT_MS = 10_000;

export class CourseRequestTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`请求超时（${Math.round(timeoutMs / 1000)} 秒）`);
    this.name = 'CourseRequestTimeoutError';
  }
}

export const formatCourseRequestError = (error) => {
  if (error instanceof CourseRequestTimeoutError) return error.message;
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message || '')) {
    return '网络连接失败';
  }
  if (error instanceof SyntaxError) return '课程数据不是有效的 JSON';
  return error?.message || '未知错误';
};

const addCacheBuster = (url, timestamp) => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${timestamp}`;
};

export const fetchCoursePayload = async ({
  url,
  isManualRefresh = false,
  timeoutMs = DEFAULT_COURSE_REQUEST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  signal,
}) => {
  const controller = new AbortController();
  let didTimeout = false;
  const handleExternalAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) {
    handleExternalAbort();
  } else {
    signal?.addEventListener('abort', handleExternalAbort, { once: true });
  }
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  const requestUrl = isManualRefresh ? addCacheBuster(url, now()) : url;

  try {
    const response = await fetchImpl(requestUrl, {
      cache: isManualRefresh ? 'no-store' : 'default',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`请求失败 (${response.status})`);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.courses)) {
      throw new Error("JSON 数据格式不正确，缺少 'courses' 数组");
    }

    return payload;
  } catch (error) {
    if (didTimeout && error?.name === 'AbortError') {
      throw new CourseRequestTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', handleExternalAbort);
  }
};
