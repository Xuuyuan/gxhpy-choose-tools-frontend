import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CourseRequestTimeoutError,
  fetchCoursePayload,
  formatCourseRequestError,
} from '../src/courseService.js';

test('普通加载使用浏览器默认缓存并校验课程数组', async () => {
  let receivedUrl;
  let receivedOptions;
  const payload = { courses: [], update_time: '现在' };
  const result = await fetchCoursePayload({
    url: '/gxhpy_classes.json',
    fetchImpl: async (url, options) => {
      receivedUrl = url;
      receivedOptions = options;
      return { ok: true, json: async () => payload };
    },
  });

  assert.equal(result, payload);
  assert.equal(receivedUrl, '/gxhpy_classes.json');
  assert.equal(receivedOptions.cache, 'default');
  assert.ok(receivedOptions.signal instanceof AbortSignal);
});

test('手动刷新绕过缓存并附加稳定的时间参数', async () => {
  let receivedUrl;
  await fetchCoursePayload({
    url: '/gxhpy_classes.json?source=test',
    isManualRefresh: true,
    now: () => 12345,
    fetchImpl: async (url, options) => {
      receivedUrl = url;
      assert.equal(options.cache, 'no-store');
      return { ok: true, json: async () => ({ courses: [] }) };
    },
  });

  assert.equal(receivedUrl, '/gxhpy_classes.json?source=test&t=12345');
});

test('HTTP 错误与无效 JSON 结构会被拒绝', async () => {
  await assert.rejects(
    fetchCoursePayload({
      url: '/courses',
      fetchImpl: async () => ({ ok: false, status: 503 }),
    }),
    /请求失败 \(503\)/,
  );

  await assert.rejects(
    fetchCoursePayload({
      url: '/courses',
      fetchImpl: async () => ({ ok: true, json: async () => ({ courses: {} }) }),
    }),
    /courses.*数组/,
  );
});

test('超时会中止请求并转换为可识别的错误', { timeout: 1000 }, async () => {
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });

  await assert.rejects(
    fetchCoursePayload({ url: '/courses', timeoutMs: 5, fetchImpl }),
    error => error instanceof CourseRequestTimeoutError && /请求超时/.test(error.message),
  );
});

test('浏览器网络错误会转换成面向用户的中文提示', () => {
  assert.equal(formatCourseRequestError(new TypeError('Failed to fetch')), '网络连接失败');
  assert.equal(formatCourseRequestError(new TypeError('Load failed')), '网络连接失败');
  assert.equal(
    formatCourseRequestError(new SyntaxError('Unexpected token < in JSON')),
    '课程数据不是有效的 JSON',
  );
  assert.equal(formatCourseRequestError(new Error('请求失败 (503)')), '请求失败 (503)');
});

test('外部取消会中止底层请求但不会伪装成超时', { timeout: 1000 }, async () => {
  const controller = new AbortController();
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('aborted by a newer load');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });

  const request = fetchCoursePayload({
    url: '/courses',
    signal: controller.signal,
    fetchImpl,
  });
  controller.abort();

  await assert.rejects(
    request,
    error => error.name === 'AbortError' && !(error instanceof CourseRequestTimeoutError),
  );
});
