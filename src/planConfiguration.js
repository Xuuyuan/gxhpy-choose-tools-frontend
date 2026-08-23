export const validatePlanConfiguration = (filters, templates) => {
  if (!Array.isArray(templates) || templates.length === 0) {
    return '请至少保留一个选课方案模板。';
  }

  const numericFilterFields = [
    ['最低报录比', filters?.minRatio],
    ['最高报录比', filters?.maxRatio],
    ['最低教学班容量', filters?.minCapacity],
  ];
  const invalidFilter = numericFilterFields.find(([, value]) => (
    value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
  ));
  if (invalidFilter) {
    return `请完整填写${invalidFilter[0]}。`;
  }

  const minRatio = Number(filters.minRatio);
  const maxRatio = Number(filters.maxRatio);
  if (minRatio > maxRatio) {
    return '最低报录比不能高于最高报录比。';
  }

  if (!Array.isArray(filters?.selectedCampuses) || filters.selectedCampuses.length === 0) {
    return '请至少选择一个校区。';
  }

  for (const [index, template] of templates.entries()) {
    const templateNumber = index + 1;
    const week = template?.week;
    if (
      typeof week !== 'number'
      || !Number.isInteger(week)
      || week < 1
      || week > 20
    ) {
      return `方案模板 ${templateNumber} 的开课周必须为 1 至 20 的整数。`;
    }

    if (
      typeof template?.periodType !== 'number'
      || ![0, 1, 2].includes(template.periodType)
    ) {
      return `方案模板 ${templateNumber} 的课程规格无效。`;
    }

    const maxCourses = template?.maxCourses;
    if (
      typeof maxCourses !== 'number'
      || !Number.isInteger(maxCourses)
      || maxCourses < 1
      || maxCourses > 12
    ) {
      return `方案模板 ${templateNumber} 的课程门数必须为 1 至 12 的整数。`;
    }

    if (!Array.isArray(template?.days) || template.days.length === 0) {
      return `方案模板 ${templateNumber} 至少需要选择一个开课星期。`;
    }

    if (template.days.some(day => typeof day !== 'number' || !Number.isInteger(day) || day < 1 || day > 7)) {
      return `方案模板 ${templateNumber} 包含无效的开课星期。`;
    }
  }

  return '';
};
