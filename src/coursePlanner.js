const SCORE_EPSILON = 1e-12;
const MIN_POSITIVE_PROBABILITY = Number.MIN_VALUE;
const EMPTY_SCORE = Object.freeze({ logProbability: 0, ratioTotal: 0, capacity: 0 });

const normalizeCourseName = (course) => (course.kcmc || '').trim();

export const estimateSelectionProbability = (course) => {
  const capacity = Number(course.jxbrl);
  const selected = Number(course.yxrs);

  if (!Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(selected) || selected < 0) {
    return 0;
  }

  // 课程数据中的已选人数尚未包含当前用户，因此按加入后的总人数估算。
  return Math.min(1, capacity / (selected + 1));
};

export const isStandardPeriod = (start, end) => (
  (start === 1 && end === 2) ||
  (start === 3 && end === 4) ||
  (start === 5 && end === 6) ||
  (start === 7 && end === 8) ||
  (start === 9 && end === 10) ||
  (start === 11 && end === 12)
);

export const matchesPeriodType = (course, periodType) => {
  const { startPeriod, endPeriod } = course.parsed;
  const isTwoPeriods = endPeriod - startPeriod === 1;

  if (periodType === 1) return isStandardPeriod(startPeriod, endPeriod);
  if (periodType === 0) return isTwoPeriods;
  if (periodType === 2) return endPeriod >= startPeriod;
  return false;
};

export const overlapsEarlyPeriods = (course) => {
  const { startPeriod, endPeriod } = course.parsed;
  return startPeriod <= 2 && endPeriod >= 1;
};

export const overlapsLatePeriods = (course) => {
  const { startPeriod, endPeriod } = course.parsed;
  return startPeriod <= 12 && endPeriod >= 9;
};

export const checkConflict = (courseA, courseB) => {
  const nameA = normalizeCourseName(courseA);
  const nameB = normalizeCourseName(courseB);
  if (nameA && nameA === nameB) return true;

  const pA = courseA.parsed;
  const pB = courseB.parsed;
  if (pA.week !== pB.week || pA.day !== pB.day) return false;

  return !(pA.endPeriod < pB.startPeriod || pA.startPeriod > pB.endPeriod);
};

const getCourseScore = (course) => {
  const probability = estimateSelectionProbability(course);
  const ratio = Number(course.parsed.ratio);
  const capacity = Number(course.jxbrl);

  return {
    logProbability: Math.log(Math.max(probability, MIN_POSITIVE_PROBABILITY)),
    ratioTotal: Number.isFinite(ratio) ? Math.max(ratio, 0) : Number.MAX_SAFE_INTEGER,
    capacity: Number.isFinite(capacity) ? capacity : 0,
  };
};

const addScore = (scoreA, scoreB) => ({
  logProbability: scoreA.logProbability + scoreB.logProbability,
  ratioTotal: scoreA.ratioTotal + scoreB.ratioTotal,
  capacity: scoreA.capacity + scoreB.capacity,
});

const compareNumber = (valueA, valueB) => {
  if (Math.abs(valueA - valueB) <= SCORE_EPSILON) return 0;
  return valueA > valueB ? 1 : -1;
};

const compareMetrics = (metricsA, metricsB) => {
  if (metricsA.count !== metricsB.count) return metricsA.count > metricsB.count ? 1 : -1;

  const probabilityComparison = compareNumber(metricsA.logProbability, metricsB.logProbability);
  if (probabilityComparison !== 0) return probabilityComparison;

  const ratioComparison = compareNumber(metricsB.ratioTotal, metricsA.ratioTotal);
  if (ratioComparison !== 0) return ratioComparison;

  return compareNumber(metricsA.capacity, metricsB.capacity);
};

const compareScores = (scoreA, scoreB) => {
  const probabilityComparison = compareNumber(scoreA.logProbability, scoreB.logProbability);
  if (probabilityComparison !== 0) return probabilityComparison;

  const ratioComparison = compareNumber(scoreB.ratioTotal, scoreA.ratioTotal);
  if (ratioComparison !== 0) return ratioComparison;

  return compareNumber(scoreA.capacity, scoreB.capacity);
};

const createMetrics = (courses, score) => ({
  count: courses.length,
  logProbability: score.logProbability,
  jointProbability: Math.exp(score.logProbability),
  ratioTotal: score.ratioTotal,
  capacity: score.capacity,
});

const getTimeCoordinate = (course, period) => (
  ((course.parsed.week * 7 + course.parsed.day) * 16) + period
);

const compareIntervals = (courseA, courseB) => (
  courseA.endCoordinate - courseB.endCoordinate ||
  courseA.startCoordinate - courseB.startCoordinate ||
  courseA.originalIndex - courseB.originalIndex
);

const findPreviousNonConflictingIndexes = (courses) => {
  const endCoordinates = courses.map(course => course.endCoordinate);

  return courses.map((course, courseIndex) => {
    let low = 0;
    let high = courseIndex - 1;
    let result = -1;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (endCoordinates[middle] < course.startCoordinate) {
        result = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    return result;
  });
};

// 先忽略“同名课程只能选一次”，用加权区间动态规划求时间约束下的精确上界。
const solveIntervalPlan = (preparedCourses, excludedIndexes, limit) => {
  const availableCourses = preparedCourses.filter(
    course => !excludedIndexes.has(course.originalIndex),
  );
  const previousIndexes = findPreviousNonConflictingIndexes(availableCourses);
  const states = Array.from(
    { length: availableCourses.length + 1 },
    () => Array(limit + 1).fill(null),
  );
  states[0][0] = { score: EMPTY_SCORE, selectedIndexes: [] };

  for (let courseCount = 1; courseCount <= availableCourses.length; courseCount += 1) {
    const candidate = availableCourses[courseCount - 1];
    const previousRow = previousIndexes[courseCount - 1] + 1;

    for (let selectedCount = 0; selectedCount <= limit; selectedCount += 1) {
      states[courseCount][selectedCount] = states[courseCount - 1][selectedCount];

      if (selectedCount === 0) continue;
      const previousState = states[previousRow][selectedCount - 1];
      if (!previousState) continue;

      const includedState = {
        score: addScore(previousState.score, candidate.score),
        selectedIndexes: [...previousState.selectedIndexes, candidate.originalIndex],
      };
      const currentState = states[courseCount][selectedCount];
      if (!currentState || compareScores(includedState.score, currentState.score) > 0) {
        states[courseCount][selectedCount] = includedState;
      }
    }
  }

  let selectedState = states[availableCourses.length][0];
  for (let selectedCount = limit; selectedCount >= 1; selectedCount -= 1) {
    const state = states[availableCourses.length][selectedCount];
    if (state) {
      selectedState = state;
      break;
    }
  }

  const courseByIndex = new Map(
    preparedCourses.map(course => [course.originalIndex, course.course]),
  );
  const selectedCourses = selectedState.selectedIndexes.map(index => courseByIndex.get(index));

  return {
    courses: selectedCourses,
    selectedIndexes: selectedState.selectedIndexes,
    metrics: createMetrics(selectedCourses, selectedState.score),
  };
};

const findDuplicateNamePair = (selectedIndexes, preparedCourseByIndex) => {
  const firstIndexByName = new Map();

  for (const index of selectedIndexes) {
    const name = preparedCourseByIndex.get(index).name;
    if (!name) continue;
    if (firstIndexByName.has(name)) return [firstIndexByName.get(name), index];
    firstIndexByName.set(name, index);
  }

  return null;
};

export const findOptimalCoursePlan = (courses, maxCourses) => {
  const limit = Math.max(0, Math.floor(Number(maxCourses) || 0));
  if (limit === 0 || courses.length === 0) {
    return {
      courses: [],
      metrics: createMetrics([], EMPTY_SCORE),
    };
  }

  const preparedCourses = courses
    .map((course, originalIndex) => ({
      course,
      originalIndex,
      name: normalizeCourseName(course),
      startCoordinate: getTimeCoordinate(course, course.parsed.startPeriod),
      endCoordinate: getTimeCoordinate(course, course.parsed.endPeriod),
      score: getCourseScore(course),
    }))
    .sort(compareIntervals);
  const preparedCourseByIndex = new Map(
    preparedCourses.map(course => [course.originalIndex, course]),
  );

  let bestResult = {
    courses: [],
    metrics: createMetrics([], EMPTY_SCORE),
  };
  const visitedExclusions = new Set();

  // 若区间最优解含同名课程，对其中一对分别排除一个并继续求上界。
  // 任意合法解至少会落入两个分支之一，因此搜索结束后的结果仍是全局最优。
  const searchNameConstraints = (excludedIndexes) => {
    const exclusionKey = [...excludedIndexes].sort((a, b) => a - b).join(',');
    if (visitedExclusions.has(exclusionKey)) return;
    visitedExclusions.add(exclusionKey);

    const intervalResult = solveIntervalPlan(preparedCourses, excludedIndexes, limit);
    if (compareMetrics(intervalResult.metrics, bestResult.metrics) <= 0) return;

    const duplicatePair = findDuplicateNamePair(
      intervalResult.selectedIndexes,
      preparedCourseByIndex,
    );
    if (!duplicatePair) {
      bestResult = {
        courses: intervalResult.courses,
        metrics: intervalResult.metrics,
      };
      return;
    }

    for (const indexToExclude of duplicatePair) {
      const nextExclusions = new Set(excludedIndexes);
      nextExclusions.add(indexToExclude);
      searchNameConstraints(nextExclusions);
    }
  };

  searchNameConstraints(new Set());
  return bestResult;
};
