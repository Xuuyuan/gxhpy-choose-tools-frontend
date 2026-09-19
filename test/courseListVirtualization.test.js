import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeVirtualWindow,
  MOBILE_COURSE_CARD_HEIGHT,
  MOBILE_COURSE_CARD_GAP,
  MOBILE_COURSE_ROW_PITCH,
} from '../src/courseListVirtualization.js';

const renderCount = range => range.endIndex - range.startIndex;

test('没有课程时不渲染任何行', () => {
  const result = computeVirtualWindow({ scrollTop: 0, viewportHeight: 500, itemCount: 0 });

  assert.deepEqual(result, {
    startIndex: 0,
    endIndex: 0,
    topSpacerHeight: 0,
    bottomSpacerHeight: 0,
  });
});

test('滚动到顶部时从第 0 行开始且顶部无占位', () => {
  const result = computeVirtualWindow({ scrollTop: 0, viewportHeight: 500, itemCount: 400 });

  assert.equal(result.startIndex, 0);
  assert.equal(result.topSpacerHeight, 0);
  assert.ok(result.endIndex > 0);
});

test('可视高度不足一屏时至少渲染一行', () => {
  const result = computeVirtualWindow({ scrollTop: 0, viewportHeight: 0, itemCount: 10, overscan: 0 });

  assert.equal(result.startIndex, 0);
  assert.equal(result.endIndex, 1);
});

test('滚动到中部时区间与占位高度匹配行高', () => {
  const scrollTop = 2000;
  const viewportHeight = 500;
  const result = computeVirtualWindow({ scrollTop, viewportHeight, itemCount: 400, overscan: 2 });

  const firstVisibleIndex = Math.floor(scrollTop / MOBILE_COURSE_ROW_PITCH);
  assert.equal(result.startIndex, firstVisibleIndex - 2);
  assert.equal(result.topSpacerHeight, result.startIndex * MOBILE_COURSE_ROW_PITCH);
  assert.ok(result.endIndex > firstVisibleIndex);
});

test('占位高度与渲染行数之和等于内容总高度', () => {
  const itemCount = 445;
  const totalHeight = itemCount * MOBILE_COURSE_ROW_PITCH;

  for (const scrollTop of [0, 137, 1500, 9999, 1e6]) {
    const result = computeVirtualWindow({ scrollTop, viewportHeight: 520, itemCount });

    assert.equal(
      result.topSpacerHeight + renderCount(result) * MOBILE_COURSE_ROW_PITCH + result.bottomSpacerHeight,
      totalHeight,
      `scrollTop=${scrollTop} 时占位与渲染行数应还原完整内容高度`,
    );
  }
});

test('滚动位置超出内容长度时被夹取且不会越界', () => {
  const itemCount = 20;
  const result = computeVirtualWindow({ scrollTop: 1e6, viewportHeight: 500, itemCount });

  assert.ok(result.endIndex <= itemCount);
  assert.ok(result.startIndex >= 0);
  assert.equal(result.bottomSpacerHeight, (itemCount - result.endIndex) * MOBILE_COURSE_ROW_PITCH);
});

test('内容不足一屏时渲染全部课程', () => {
  const itemCount = 3;
  const result = computeVirtualWindow({ scrollTop: 0, viewportHeight: 900, itemCount });

  assert.equal(result.startIndex, 0);
  assert.equal(result.endIndex, itemCount);
  assert.equal(result.bottomSpacerHeight, 0);
});

test('负数滚动位置与负数行数被规整为 0', () => {
  const result = computeVirtualWindow({ scrollTop: -200, viewportHeight: 500, itemCount: 30 });

  assert.equal(result.startIndex, 0);
  assert.equal(result.topSpacerHeight, 0);
  assert.equal(computeVirtualWindow({ itemCount: -5 }).endIndex, 0);
});

test('默认行高与间距用于计算 pitch', () => {
  assert.equal(MOBILE_COURSE_ROW_PITCH, MOBILE_COURSE_CARD_HEIGHT + MOBILE_COURSE_CARD_GAP);
  assert.ok(MOBILE_COURSE_CARD_HEIGHT > 0);
  assert.ok(MOBILE_COURSE_CARD_GAP >= 0);
});
