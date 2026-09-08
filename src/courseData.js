export const dayMap = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  7: '日',
};

const dayMapReverse = {
  '星期一': 1,
  '星期二': 2,
  '星期三': 3,
  '星期四': 4,
  '星期五': 5,
  '星期六': 6,
  '星期日': 7,
};

export const getTeacherDisplayName = (teacherInfo) => {
  if (teacherInfo === null || teacherInfo === undefined || teacherInfo === '') return '';
  const text = String(teacherInfo);
  const parts = text.split('/');
  return parts.length > 1 ? parts[1] : text;
};

const normalizeTextField = value => (
  value === null || value === undefined ? '' : String(value)
);

export const parseWeek = (courseTime) => {
  if (typeof courseTime !== 'string') return null;
  const match = courseTime.match(/\{(\d+)周\}/);
  return match ? parseInt(match[1], 10) : null;
};

export const parseDay = (courseTime) => {
  if (typeof courseTime !== 'string') return null;

  for (const [label, day] of Object.entries(dayMapReverse)) {
    if (courseTime.includes(label)) return day;
  }

  return null;
};

export const parseStartPeriod = (courseTime) => {
  if (typeof courseTime !== 'string') return null;
  const match = courseTime.match(/第(\d+)-\d+节/);
  return match ? parseInt(match[1], 10) : null;
};

export const parseEndPeriod = (courseTime) => {
  if (typeof courseTime !== 'string') return null;
  const match = courseTime.match(/第\d+-(\d+)节/);
  return match ? parseInt(match[1], 10) : null;
};

export const preprocessCourses = (courses) => courses
  .map((course, index) => {
    if (!course || typeof course !== 'object') return null;

    const jxbrl = parseInt(course.jxbrl, 10);
    const yxrs = parseInt(course.yxrs, 10);
    const week = parseWeek(course.sksj);
    const day = parseDay(course.sksj);
    const startPeriod = parseStartPeriod(course.sksj);
    const endPeriod = parseEndPeriod(course.sksj);

    if (
      week === null
      || day === null
      || startPeriod === null
      || endPeriod === null
      || Number.isNaN(jxbrl)
      || Number.isNaN(yxrs)
      || jxbrl < 0
      || yxrs < 0
      || startPeriod < 1
      || endPeriod > 12
      || endPeriod < startPeriod
    ) {
      return null;
    }

    const ratio = jxbrl > 0 ? yxrs / jxbrl : (yxrs > 0 ? 999 : 0);
    const kcmc = normalizeTextField(course.kcmc);
    const jxdd = normalizeTextField(course.jxdd);

    return {
      ...course,
      kcmc,
      jxdd,
      virtualRowKey: course.jxb_id || `${kcmc}-${course.sksj}-${index}`,
      jxbrl,
      yxrs,
      display: {
        teacherName: getTeacherDisplayName(course.jsxx),
        selectedCapacity: `${yxrs}/${jxbrl}`,
        ratio: (ratio || 0).toFixed(2),
        day: dayMap[day],
        period: `${startPeriod}-${endPeriod}`,
      },
      parsed: {
        week,
        day,
        startPeriod,
        endPeriod,
        ratio,
      },
    };
  })
  .filter(course => course !== null);

export const prepareCourseData = (courses) => {
  if (!Array.isArray(courses)) {
    throw new Error("JSON 数据格式不正确，缺少 'courses' 数组");
  }

  const processedCourses = preprocessCourses(courses);
  if (processedCourses.length === 0) {
    throw new Error(courses.length === 0 ? '课程列表为空' : '没有可识别的有效课程记录');
  }

  return {
    courses: processedCourses,
    rejectedCount: courses.length - processedCourses.length,
  };
};

// 输入框支持中英文逗号，忽略空白和重复条件。
export const parseExclusionTerms = value => (
  [...new Set(String(value ?? '').split(/[,，]/).map(term => term.trim()).filter(Boolean))]
);

// 忽略接口记录顺序和无关元数据，保留影响筛选、求解和结果展示的字段。
export const areCourseListsEquivalent = (previous, next) => {
  if (previous.length !== next.length) return false;
  const signatures = courses => courses.map(course => JSON.stringify([
    course.jxb_id ?? null, course.kcmc, course.jsxx ?? '', course.sksj,
    course.jxdd, course.jxbrl, course.yxrs,
  ])).sort();
  const previousSignatures = signatures(previous);
  return signatures(next).every((signature, index) => signature === previousSignatures[index]);
};
