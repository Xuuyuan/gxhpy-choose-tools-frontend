<template>
  <section class="results-pane" aria-label="生成的选课方案" aria-live="polite">
    <div v-if="plans.length === 0" class="result-empty">
      {{ emptyMessage }}
    </div>

    <p v-if="plans.length > 0" class="probability-note">
      成功率为等概率随机筛选、各课程结果近似独立时的估算，依据当前课程数据计算，不代表实际录取结果。
    </p>

    <el-collapse
      v-if="plans.length > 0"
      :model-value="activePlanNames"
      @update:model-value="updateActivePlanNames"
    >
      <el-collapse-item
        v-for="(plan, planIndex) in plans"
        :key="planIndex"
        :name="planIndex"
      >
        <template #title>
          <span class="plan-title">
            方案 {{ planIndex + 1 }}（{{ formatTemplate(plan.template) }}）— 共
            {{ plan.courses.length }} 门，估算全选成功率
            {{ formatProbability(plan.metrics?.jointProbability) }}
          </span>
        </template>

        <p v-if="plan.courses.length === 0" class="plan-course-empty">
          该模板没有符合条件的课程，请返回配置页调整筛选条件或模板。
        </p>

        <el-table
          v-else-if="!isMobile"
          :data="plan.courses"
          stripe
          border
          class="desktop-plan-table"
        >
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="kcmc" label="课程名称" min-width="180" />
          <el-table-column prop="jsxx" label="教师信息" width="150" />
          <el-table-column prop="sksj" label="上课时间" width="180" />
          <el-table-column prop="jxdd" label="上课地点" width="150" />
          <el-table-column label="已选/容量" width="100">
            <template #default="{ row }">
              {{ formatEnrollment(row) }}
            </template>
          </el-table-column>
          <el-table-column label="报录比" width="100">
            <template #default="{ row }">
              {{ formatRatio(row) }}
            </template>
          </el-table-column>
        </el-table>

        <div v-if="isMobile && plan.courses.length > 0" class="mobile-course-list">
          <article
            v-for="(course, courseIndex) in plan.courses"
            :key="course.virtualRowKey ?? course.jxb_id ?? `${planIndex}-${courseIndex}`"
            class="course-card"
          >
            <header class="course-card-header">
              <span class="course-index">{{ courseIndex + 1 }}</span>
              <h3>{{ displayValue(course.kcmc) }}</h3>
            </header>

            <dl class="course-details">
              <div class="course-detail course-detail-wide">
                <dt>教师</dt>
                <dd>{{ displayValue(course.jsxx) }}</dd>
              </div>
              <div class="course-detail course-detail-wide">
                <dt>时间</dt>
                <dd>{{ displayValue(course.sksj) }}</dd>
              </div>
              <div class="course-detail course-detail-wide">
                <dt>地点</dt>
                <dd>{{ displayValue(course.jxdd) }}</dd>
              </div>
              <div class="course-detail">
                <dt>已选/容量</dt>
                <dd>{{ formatEnrollment(course) }}</dd>
              </div>
              <div class="course-detail">
                <dt>报录比</dt>
                <dd>{{ formatRatio(course) }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </el-collapse-item>
    </el-collapse>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const mobileQuery = window.matchMedia('(max-width: 767px)');
const isMobile = ref(mobileQuery.matches);
const updateLayout = (event) => { isMobile.value = event.matches; };
onMounted(() => mobileQuery.addEventListener('change', updateLayout));
onUnmounted(() => mobileQuery.removeEventListener('change', updateLayout));

defineProps({
  plans: {
    type: Array,
    default: () => [],
  },
  activePlanNames: {
    type: Array,
    default: () => [],
  },
  emptyMessage: {
    type: String,
    default: '请先在“课程筛选与方案配置”标签页中配置并点击“生成选课方案”',
  },
});

const emit = defineEmits(['update:activePlanNames']);

const dayLabels = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
};

const periodTypeLabels = {
  0: '任意连续两节',
  1: '标准两节',
  2: '任意课程',
};

const updateActivePlanNames = (names) => {
  emit('update:activePlanNames', Array.isArray(names) ? names : []);
};

const formatDays = (days) => {
  if (!Array.isArray(days) || days.length === 0) return '未选择星期';

  const labels = days
    .map(day => dayLabels[Number(day)])
    .filter(Boolean);

  return labels.length > 0 ? labels.join('、') : '未选择星期';
};

const formatTemplate = (template = {}) => {
  const week = Number(template.week);
  const weekLabel = Number.isFinite(week) ? `第 ${week} 周` : '周次未设置';
  const periodLabel = periodTypeLabels[Number(template.periodType)] ?? '课程规格未设置';
  const targetCount = Number(template.maxCourses);
  const targetLabel = Number.isFinite(targetCount) ? `目标 ${targetCount} 门` : '目标门数未设置';
  const exclusions = [];
  if (template.excludeEarlyPeriods) exclusions.push('排除早八');
  if (template.excludeLatePeriods) exclusions.push('排除晚课');
  const exclusionLabel = exclusions.length > 0 ? ` · ${exclusions.join('、')}` : '';

  return `${weekLabel} · ${formatDays(template.days)} · ${periodLabel} · ${targetLabel}${exclusionLabel}`;
};

const formatProbability = (probability) => {
  const value = Number(probability);
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '暂无';
};

const displayValue = value => (
  value === undefined || value === null || value === '' ? '暂无' : value
);

const formatEnrollment = course => (
  `${displayValue(course?.yxrs)}/${displayValue(course?.jxbrl)}`
);

const formatRatio = (course) => {
  const ratio = Number(course?.parsed?.ratio);
  return Number.isFinite(ratio) ? ratio.toFixed(2) : '暂无';
};
</script>

<style scoped>
.results-pane {
  min-width: 0;
  max-width: 100%;
  min-height: 320px;
  box-sizing: border-box;
  padding: 20px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
}

.result-empty {
  padding: 72px 24px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.78);
  text-align: center;
}

.plan-title {
  display: block;
  min-width: 0;
  padding-right: 12px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.desktop-plan-table {
  width: 100%;
}

.plan-course-empty {
  margin: 0 0 16px;
  padding: 18px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  color: #64748b;
  background: #f8fafc;
  text-align: center;
}

.probability-note {
  margin: 0 0 16px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

:deep(.el-collapse) {
  border-radius: 10px;
}

:deep(.el-collapse-item__header) {
  min-width: 0;
  height: auto;
  min-height: 48px;
  padding: 10px 8px;
  align-items: flex-start;
  line-height: 1.5;
}

:deep(.el-collapse-item__title) {
  min-width: 0;
}

:deep(.el-collapse-item__arrow) {
  flex-shrink: 0;
  margin-top: 4px;
}

@media (max-width: 767px) {
  .results-pane {
    min-height: 260px;
    padding: 12px;
    border-radius: 12px;
  }

  .result-empty {
    padding: 52px 16px;
  }

  .mobile-course-list {
    display: grid;
    min-width: 0;
    gap: 12px;
    padding: 2px 0 14px;
  }

  .course-card {
    min-width: 0;
    box-sizing: border-box;
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
  }

  .course-card-header {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
  }

  .course-card-header h3 {
    min-width: 0;
    margin: 0;
    color: #0f172a;
    font-size: 15px;
    line-height: 1.5;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .course-index {
    display: inline-flex;
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    color: #1d4ed8;
    background: #dbeafe;
    font-size: 12px;
    font-weight: 600;
  }

  .course-details {
    display: grid;
    min-width: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 14px;
    margin: 0;
  }

  .course-detail {
    min-width: 0;
  }

  .course-detail-wide {
    grid-column: 1 / -1;
  }

  .course-detail dt {
    margin-bottom: 3px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
  }

  .course-detail dd {
    min-width: 0;
    margin: 0;
    color: #334155;
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 10px;
  }
}
</style>
