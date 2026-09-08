import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultPreferences, createAdditionalTemplate, loadPlannerPreferences, savePlannerPreferences } from '../src/plannerPreferences.js';

const memoryStorage = () => {
  let value = null;
  return { getItem: () => value, setItem: (_key, next) => { value = next; } };
};

test('配置保存后恢复，恢复默认值不会共享数组', () => {
  const storage = memoryStorage();
  const preferences = createDefaultPreferences();
  preferences.filters.excludeCourseNames = '课程甲，课程乙';
  preferences.templates[0].week = 12;
  assert.equal(savePlannerPreferences(preferences, () => storage), '');
  assert.deepEqual(loadPlannerPreferences(() => storage).preferences, preferences);
  preferences.templates[0].days.push(2);
  assert.deepEqual(createDefaultPreferences().templates[0].days, [1]);
  assert.equal(savePlannerPreferences(createDefaultPreferences(), () => storage), '');
  assert.deepEqual(loadPlannerPreferences(() => storage).preferences, createDefaultPreferences());
});

test('损坏、旧版本或字段类型错误的配置回退到默认值', () => {
  const good = { version: 1, ...createDefaultPreferences() };
  for (const raw of ['{', 'null', JSON.stringify({ ...good, version: 2 }), JSON.stringify({ ...good, filters: { ...good.filters, selectedCampuses: '旗山校区' } }), JSON.stringify({ ...good, templates: [{ ...good.templates[0], days: [8] }] })]) {
    const result = loadPlannerPreferences(() => ({ getItem: () => raw }));
    assert.deepEqual(result.preferences, createDefaultPreferences());
    assert.ok(result.error);
  }
});

test('存储拒绝访问或写入失败时不影响使用', () => {
  const unavailable = () => { throw new Error('storage unavailable'); };
  assert.ok(loadPlannerPreferences(unavailable).error);
  assert.ok(savePlannerPreferences(createDefaultPreferences(), unavailable));
  assert.ok(savePlannerPreferences(createDefaultPreferences(), () => ({ setItem: () => { throw new Error('quota'); } })));
});

test('允许空模板和未完成选项草稿，但不保存无关字段', () => {
  const storage = memoryStorage();
  const preferences = createDefaultPreferences();
  preferences.templates = [];
  preferences.filters.selectedCampuses = [];
  preferences.filters.minRatio = null;
  preferences.filters.extra = '不应保留';
  assert.equal(savePlannerPreferences(preferences, () => storage), '');
  const restored = loadPlannerPreferences(() => storage).preferences;
  assert.equal(restored.filters.minRatio, null);
  assert.deepEqual(restored.templates, []);
  assert.equal(restored.filters.extra, undefined);
});

test('新增模板继承最近有效周次，没有模板时使用默认周次', () => {
  assert.equal(createAdditionalTemplate([{ week: 12 }, { week: null }]).week, 12);
  assert.equal(createAdditionalTemplate([]).week, 11);
  const first = createAdditionalTemplate([]);
  first.days.push(7);
  assert.deepEqual(createAdditionalTemplate([]).days, [1, 2, 3, 4, 5]);
});
