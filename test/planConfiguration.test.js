import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePlanConfiguration } from '../src/planConfiguration.js';

const validFilters = {
  minRatio: 0.3,
  maxRatio: 10,
  minCapacity: 90,
  selectedCampuses: ['旗山校区'],
};

const validTemplates = [{ days: [1], week: 11, periodType: 0, maxCourses: 3 }];

test('有效的筛选与模板配置通过校验', () => {
  assert.equal(validatePlanConfiguration(validFilters, validTemplates), '');
});

test('没有模板时阻止生成方案', () => {
  assert.match(validatePlanConfiguration(validFilters, []), /至少保留一个/);
});

test('报录比上下限倒置时阻止生成方案', () => {
  assert.match(
    validatePlanConfiguration({ ...validFilters, minRatio: 2, maxRatio: 1 }, validTemplates),
    /最低报录比不能高于最高报录比/,
  );
});

test('未选择校区或模板星期时给出具体提示', () => {
  assert.match(
    validatePlanConfiguration({ ...validFilters, selectedCampuses: [] }, validTemplates),
    /至少选择一个校区/,
  );
  assert.match(
    validatePlanConfiguration(validFilters, [{ ...validTemplates[0], days: [] }]),
    /方案模板 1/,
  );
});

test('拒绝被清空的数字筛选值', () => {
  assert.match(
    validatePlanConfiguration({ ...validFilters, minRatio: null }, validTemplates),
    /完整填写最低报录比/,
  );
  assert.match(
    validatePlanConfiguration({ ...validFilters, minCapacity: '' }, validTemplates),
    /完整填写最低教学班容量/,
  );
});

test('逐模板校验周次、课程规格和课程门数', () => {
  assert.match(
    validatePlanConfiguration(validFilters, [{ ...validTemplates[0], week: null }]),
    /开课周必须为 1 至 20/,
  );
  assert.match(
    validatePlanConfiguration(validFilters, [{ ...validTemplates[0], periodType: null }]),
    /课程规格无效/,
  );
  assert.match(
    validatePlanConfiguration(validFilters, [{ ...validTemplates[0], maxCourses: null }]),
    /课程门数必须为 1 至 12/,
  );
  assert.match(
    validatePlanConfiguration(validFilters, [{ ...validTemplates[0], week: '11' }]),
    /开课周必须为 1 至 20/,
  );
  assert.match(
    validatePlanConfiguration(validFilters, [{ ...validTemplates[0], days: ['1'] }]),
    /无效的开课星期/,
  );
});
