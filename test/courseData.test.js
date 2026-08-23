import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTeacherDisplayName,
  prepareCourseData,
  preprocessCourses,
} from '../src/courseData.js';

const createCourse = (overrides = {}) => ({
  kcmc: '数据科学导论',
  jsxx: '2026001/张三',
  sksj: '{11周}星期五第3-4节',
  jxdd: '旗山校区',
  jxbrl: '120',
  yxrs: '30',
  ...overrides,
});

test('预处理生成 UI 可直接使用的解析与展示字段', () => {
  const [course] = preprocessCourses([createCourse({ jxb_id: 'class-1' })]);

  assert.equal(course.jxbrl, 120);
  assert.equal(course.yxrs, 30);
  assert.equal(course.virtualRowKey, 'class-1');
  assert.deepEqual(course.parsed, {
    week: 11,
    day: 5,
    startPeriod: 3,
    endPeriod: 4,
    ratio: 0.25,
  });
  assert.deepEqual(course.display, {
    teacherName: '张三',
    selectedCapacity: '30/120',
    ratio: '0.25',
    day: '五',
    period: '3-4',
  });
});

test('无效上课时间或数字字段的记录会被过滤', () => {
  const validCourse = createCourse({ kcmc: '有效课程' });
  const courses = preprocessCourses([
    validCourse,
    null,
    createCourse({ sksj: '时间待定' }),
    createCourse({ sksj: null }),
    createCourse({ jxbrl: '未知' }),
    createCourse({ yxrs: '未知' }),
  ]);

  assert.equal(courses.length, 1);
  assert.equal(courses[0].kcmc, '有效课程');
});

test('容量为 0 时使用既有的有人 999、无人 0 比率语义', () => {
  const [selectedCourse, emptyCourse] = preprocessCourses([
    createCourse({ jxbrl: '0', yxrs: '8' }),
    createCourse({ jxbrl: '0', yxrs: '0' }),
  ]);

  assert.equal(selectedCourse.parsed.ratio, 999);
  assert.equal(selectedCourse.display.ratio, '999.00');
  assert.equal(emptyCourse.parsed.ratio, 0);
  assert.equal(emptyCourse.display.ratio, '0.00');
});

test('教师显示名保留既有的斜杠分段规则', () => {
  assert.equal(getTeacherDisplayName('2026001/张三/副教授'), '张三');
  assert.equal(getTeacherDisplayName('李四'), '李四');
  assert.equal(getTeacherDisplayName(''), '');
  assert.equal(getTeacherDisplayName(null), '');
  assert.equal(getTeacherDisplayName(12345), '12345');
});

test('无教学班 ID 的重复课程仍获得唯一的虚拟行键', () => {
  const courses = preprocessCourses([
    createCourse({ kcmc: '重复课程' }),
    createCourse({ kcmc: '重复课程' }),
  ]);
  const rowKeys = courses.map(course => course.virtualRowKey);

  assert.equal(new Set(rowKeys).size, courses.length);
  assert.match(rowKeys[0], /-0$/);
  assert.match(rowKeys[1], /-1$/);
});

test('准备课程数据时拒绝空列表或全无效列表，并报告部分无效记录', () => {
  assert.throws(() => prepareCourseData([]), /课程列表为空/);
  assert.throws(
    () => prepareCourseData([createCourse({ sksj: '时间待定' })]),
    /没有可识别的有效课程记录/,
  );

  const result = prepareCourseData([
    createCourse(),
    createCourse({ yxrs: '未知' }),
  ]);
  assert.equal(result.courses.length, 1);
  assert.equal(result.rejectedCount, 1);
});

test('负人数、倒置课时或超出第 12 节的记录会被过滤', () => {
  const courses = preprocessCourses([
    createCourse({ jxbrl: '-1' }),
    createCourse({ yxrs: '-1' }),
    createCourse({ sksj: '{11周}星期五第4-3节' }),
    createCourse({ sksj: '{11周}星期五第12-13节' }),
    createCourse({ jsxx: 12345 }),
  ]);

  assert.equal(courses.length, 1);
  assert.equal(courses[0].display.teacherName, '12345');
});

test('课程名称与地点会规范化为可筛选的字符串', () => {
  const [course] = preprocessCourses([
    createCourse({ kcmc: 123, jxdd: 456 }),
  ]);

  assert.equal(course.kcmc, '123');
  assert.equal(course.jxdd, '456');
});
