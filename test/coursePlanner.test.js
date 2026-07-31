import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkConflict,
  estimateSelectionProbability,
  findOptimalCoursePlan,
  matchesPeriodType,
  overlapsLatePeriods,
} from '../src/coursePlanner.js';

const createCourse = ({
  name,
  start,
  end,
  selected = 10,
  capacity = 100,
  week = 1,
  day = 1,
}) => ({
  kcmc: name,
  yxrs: selected,
  jxbrl: capacity,
  parsed: {
    week,
    day,
    startPeriod: start,
    endPeriod: end,
    ratio: selected / capacity,
  },
});

test('精确求解不会被低报录比但阻塞多个时段的课程误导', () => {
  const courses = [
    createCourse({ name: 'A', start: 2, end: 3, selected: 10 }),
    createCourse({ name: 'B', start: 1, end: 2, selected: 20 }),
    createCourse({ name: 'C', start: 3, end: 4, selected: 20 }),
  ];

  const result = findOptimalCoursePlan(courses, 2);

  assert.deepEqual(result.courses.map(course => course.kcmc).sort(), ['B', 'C']);
});

test('门数相同时选择联合成功概率更高的组合', () => {
  const courses = [
    createCourse({ name: '小班课', start: 1, end: 2, selected: 100, capacity: 100 }),
    createCourse({ name: '大班课', start: 1, end: 2, selected: 500, capacity: 500 }),
    createCourse({ name: '另一时段', start: 3, end: 4, selected: 100, capacity: 100 }),
  ];

  const result = findOptimalCoursePlan(courses, 2);

  assert.deepEqual(result.courses.map(course => course.kcmc).sort(), ['另一时段', '大班课']);
  assert.ok(result.metrics.jointProbability > 0.98);
});

test('预计成功率相同时优先选择报录比更低的课程', () => {
  const courses = [
    createCourse({ name: '低报录比', start: 1, end: 2, selected: 10, capacity: 100 }),
    createCourse({ name: '高报录比', start: 1, end: 2, selected: 90, capacity: 100 }),
  ];

  const result = findOptimalCoursePlan(courses, 1);

  assert.equal(result.courses[0].kcmc, '低报录比');
  assert.equal(result.metrics.ratioTotal, 0.1);
});

test('同名课程即使时间不同也不会重复选择', () => {
  const courses = [
    createCourse({ name: '同一课程', start: 1, end: 2 }),
    createCourse({ name: ' 同一课程 ', start: 3, end: 4 }),
    createCourse({ name: '其他课程', start: 3, end: 4 }),
  ];

  const result = findOptimalCoursePlan(courses, 2);

  assert.equal(result.courses.filter(course => course.kcmc.trim() === '同一课程').length, 1);
  assert.equal(result.courses.length, 2);
});

test('任意两节课只接受恰好连续两节的课程', () => {
  assert.equal(matchesPeriodType(createCourse({ name: '两节', start: 2, end: 3 }), 0), true);
  assert.equal(matchesPeriodType(createCourse({ name: '单节', start: 2, end: 2 }), 0), false);
  assert.equal(matchesPeriodType(createCourse({ name: '倒序', start: 3, end: 2 }), 0), false);
});

test('晚课判断会排除所有与第9-12节重叠的课程', () => {
  assert.equal(overlapsLatePeriods(createCourse({ name: '白天课', start: 7, end: 8 })), false);
  assert.equal(overlapsLatePeriods(createCourse({ name: '9-10节', start: 9, end: 10 })), true);
  assert.equal(overlapsLatePeriods(createCourse({ name: '10-11节', start: 10, end: 11 })), true);
  assert.equal(overlapsLatePeriods(createCourse({ name: '11-12节', start: 11, end: 12 })), true);
});

test('预计成功率将当前用户计入申请人数', () => {
  const course = createCourse({ name: '满额课程', start: 1, end: 2, selected: 100, capacity: 100 });
  assert.equal(estimateSelectionProbability(course), 100 / 101);
});

test('精确求解结果与小规模穷举结果一致', () => {
  let seed = 20260731;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  const getMetrics = (courses) => ({
    count: courses.length,
    logProbability: courses.reduce(
      (total, course) => total + Math.log(Math.max(estimateSelectionProbability(course), Number.MIN_VALUE)),
      0,
    ),
    ratioTotal: courses.reduce(
      (total, course) => total + Math.max(course.parsed.ratio, 0),
      0,
    ),
    capacity: courses.reduce((total, course) => total + course.jxbrl, 0),
  });
  const isBetter = (candidate, current) => {
    if (candidate.count !== current.count) return candidate.count > current.count;
    if (Math.abs(candidate.logProbability - current.logProbability) > 1e-12) {
      return candidate.logProbability > current.logProbability;
    }
    if (Math.abs(candidate.ratioTotal - current.ratioTotal) > 1e-12) {
      return candidate.ratioTotal < current.ratioTotal;
    }
    if (candidate.capacity !== current.capacity) return candidate.capacity > current.capacity;
    return false;
  };

  for (let caseIndex = 0; caseIndex < 50; caseIndex += 1) {
    const courses = Array.from({ length: 8 }, (_, courseIndex) => {
      const start = 1 + Math.floor(random() * 5);
      const capacity = 80 + Math.floor(random() * 121);
      return createCourse({
        name: `课程${Math.floor(random() * 6)}`,
        start,
        end: start + 1,
        selected: Math.floor(random() * 240),
        capacity,
        day: 1 + Math.floor(random() * 2),
        week: 1,
        id: courseIndex,
      });
    });
    const limit = 1 + Math.floor(random() * 4);

    let bruteForceMetrics = getMetrics([]);
    for (let mask = 0; mask < (1 << courses.length); mask += 1) {
      const selected = courses.filter((_, index) => (mask & (1 << index)) !== 0);
      if (selected.length > limit) continue;
      if (selected.some((course, index) => (
        selected.slice(index + 1).some(other => checkConflict(course, other))
      ))) continue;

      const metrics = getMetrics(selected);
      if (isBetter(metrics, bruteForceMetrics)) bruteForceMetrics = metrics;
    }

    const result = findOptimalCoursePlan(courses, limit);
    const resultMetrics = getMetrics(result.courses);
    assert.equal(resultMetrics.count, bruteForceMetrics.count, `case ${caseIndex}: count`);
    assert.ok(
      Math.abs(resultMetrics.logProbability - bruteForceMetrics.logProbability) <= 1e-12,
      `case ${caseIndex}: probability`,
    );
    assert.ok(
      Math.abs(resultMetrics.ratioTotal - bruteForceMetrics.ratioTotal) <= 1e-12,
      `case ${caseIndex}: ratio`,
    );
    assert.equal(resultMetrics.capacity, bruteForceMetrics.capacity, `case ${caseIndex}: capacity`);
  }
});
