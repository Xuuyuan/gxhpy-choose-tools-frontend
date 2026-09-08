const STORAGE_KEY = 'gxhpy.planner-preferences.v1';

export const createDefaultPreferences = () => ({
  filters: {
    minRatio: 0.3,
    maxRatio: 10,
    minCapacity: 90,
    selectedCampuses: ['旗山校区'],
    excludeOutdoorPrefix: '个性周-室外,东区,健美操馆',
    excludeCourseNames: '',
  },
  templates: [
    { week: 11, periodType: 0, days: [1], excludeEarlyPeriods: true, excludeLatePeriods: false, maxCourses: 3 },
    { week: 11, periodType: 0, days: [5], excludeEarlyPeriods: true, excludeLatePeriods: false, maxCourses: 3 },
  ],
});

// 允许未填完的数字和空选项作为草稿保存；生成时仍由配置校验检查。
const isDraftNumber = (value, min, max, integer = false) => value === null || (
  typeof value === 'number' && Number.isFinite(value)
  && value >= min && value <= max && (!integer || Number.isInteger(value))
);
const normalizePreferences = (value) => {
  const filters = value?.filters;
  const templates = value?.templates;
  if (!filters || !isDraftNumber(filters.minRatio, 0, 20)
    || !isDraftNumber(filters.maxRatio, 0, 20)
    || !isDraftNumber(filters.minCapacity, 0, Number.MAX_SAFE_INTEGER)
    || !Array.isArray(filters.selectedCampuses)
    || filters.selectedCampuses.some(campus => !['旗山校区', '仓山校区'].includes(campus))
    || typeof filters.excludeOutdoorPrefix !== 'string'
    || typeof filters.excludeCourseNames !== 'string'
    || !Array.isArray(templates)
    || templates.some(template => !template
      || !isDraftNumber(template.week, 1, 20, true)
      || ![0, 1, 2].includes(template.periodType)
      || !isDraftNumber(template.maxCourses, 1, 12, true)
      || !Array.isArray(template.days)
      || template.days.some(day => !Number.isInteger(day) || day < 1 || day > 7)
      || typeof template.excludeEarlyPeriods !== 'boolean'
      || typeof template.excludeLatePeriods !== 'boolean')) {
    throw new Error('配置格式无效');
  }
  return {
    filters: {
      minRatio: filters.minRatio, maxRatio: filters.maxRatio, minCapacity: filters.minCapacity,
      selectedCampuses: [...filters.selectedCampuses],
      excludeOutdoorPrefix: filters.excludeOutdoorPrefix, excludeCourseNames: filters.excludeCourseNames,
    },
    templates: templates.map(template => ({
      week: template.week, periodType: template.periodType, days: [...template.days],
      excludeEarlyPeriods: template.excludeEarlyPeriods, excludeLatePeriods: template.excludeLatePeriods,
      maxCourses: template.maxCourses,
    })),
  };
};

export const loadPlannerPreferences = (getStorage = () => window.localStorage) => {
  try {
    const raw = getStorage().getItem(STORAGE_KEY);
    if (!raw) return { preferences: createDefaultPreferences(), error: '' };
    const saved = JSON.parse(raw);
    if (saved.version !== 1) throw new Error('配置版本不兼容');
    return { preferences: normalizePreferences(saved), error: '' };
  } catch {
    return { preferences: createDefaultPreferences(), error: '本地配置无法读取，已使用默认配置。' };
  }
};

export const savePlannerPreferences = (preferences, getStorage = () => window.localStorage) => {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...normalizePreferences(preferences) }));
    return '';
  } catch {
    return '配置暂未保存到本机，刷新页面可能丢失本次修改。';
  }
};

export const createAdditionalTemplate = (templates) => ({
  week: templates.findLast(template => Number.isInteger(template.week) && template.week >= 1 && template.week <= 20)?.week
    ?? createDefaultPreferences().templates[0].week,
  periodType: 0, days: [1, 2, 3, 4, 5],
  excludeEarlyPeriods: false, excludeLatePeriods: false, maxCourses: 8,
});
