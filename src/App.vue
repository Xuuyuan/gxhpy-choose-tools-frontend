<template>
  <el-container class="app-shell">
    
    <el-header class="app-header">
      <div class="app-header-content">
        <div>
          <h1 class="app-title">个性化培养周选课工具</h1>
        </div>
      </div>
    </el-header>

    <el-main
      class="app-main"
    >
      <el-tabs v-model="activeTab" class="app-tabs">
        
        <el-tab-pane label="课程筛选与方案配置" name="config">
          <el-row :gutter="24" class="workspace-grid">
            <el-col :span="24" :lg="7">
              <el-card header="1. 基本筛选条件" class="panel-card filter-card">
                <el-form :model="filters" label-position="top">

                  <el-row :gutter="20">
                    <el-col :span="24" :md="12">
                      <el-form-item label="最低报录比 (已选/容量)">
                        <template #label>
                          <el-tooltip
                            content="报录比过低时，存在不开课的可能性"
                            placement="top"
                            :show-after="200"
                            popper-class="filter-tooltip"
                          >
                            <span class="filter-label-with-tooltip" tabindex="0">最低报录比 (已选/容量)</span>
                          </el-tooltip>
                        </template>
                        <el-input-number v-model="filters.minRatio" :min="0" :max="20" :step="0.1" controls-position="right" style="width: 100%;" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="24" :md="12">
                      <el-form-item label="最高报录比 (已选/容量)">
                        <template #label>
                          <el-tooltip
                            content="在一轮选课时若报录比大于1，存在被筛除出课程的可能性"
                            placement="top"
                            :show-after="200"
                            popper-class="filter-tooltip"
                          >
                            <span class="filter-label-with-tooltip" tabindex="0">最高报录比 (已选/容量)</span>
                          </el-tooltip>
                        </template>
                        <el-input-number v-model="filters.maxRatio" :min="0" :max="20" :step="0.1" controls-position="right" style="width: 100%;" />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="20">
                    <el-col :span="24" :md="12">
                      <el-form-item label="最低教学班容量">
                        <template #label>
                          <el-tooltip
                            content="选择合适的教学班容量可以避免选到小班课"
                            placement="top"
                            :show-after="200"
                            popper-class="filter-tooltip"
                          >
                            <span class="filter-label-with-tooltip" tabindex="0">最低教学班容量</span>
                          </el-tooltip>
                        </template>
                        <el-input-number v-model="filters.minCapacity" :min="0" :step="10" controls-position="right" style="width: 100%;" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="24" :md="12">
                      <el-form-item label="校区选择">
                        <el-checkbox-group v-model="filters.selectedCampuses" class="responsive-checkbox-group">
                          <el-checkbox label="旗山校区" />
                          <el-checkbox label="仓山校区" />
                        </el-checkbox-group>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-form-item label="[排除] 特定地点 (中英文逗号分隔)">
                    <template #label>
                      <el-tooltip
                        content="排除特定地点可以避免选取到室外或特殊教学楼课程"
                        placement="top"
                        :show-after="200"
                        popper-class="filter-tooltip"
                      >
                        <span class="filter-label-with-tooltip" tabindex="0">[排除] 特定地点 (中英文逗号分隔)</span>
                      </el-tooltip>
                    </template>
                    <el-input v-model="filters.excludeOutdoorPrefix" placeholder="个性周-室外,东区,健美操馆" />
                    <small class="filter-recognized">已识别地点前缀：{{ excludedLocations.join("、") || "无" }}</small>
                  </el-form-item>

                  <el-form-item label="[排除] 特定课程名称 (中英文逗号分隔)">
                    <template #label>
                      <el-tooltip
                        content="排除特定课程名称为备选项，用于避免抓取的课程列表含面向特定学院的开课而导致无法正常选课问题"
                        placement="top"
                        :show-after="200"
                        popper-class="filter-tooltip"
                      >
                        <span class="filter-label-with-tooltip" tabindex="0">[排除] 特定课程名称 (中英文逗号分隔)</span>
                      </el-tooltip>
                    </template>
                    <el-input
                      v-model="filters.excludeCourseNames"
                      placeholder="课程名称A,课程名称B"
                      clearable
                    />
                    <small class="filter-recognized">已识别课程名称：{{ excludedNames.join("、") || "无" }}</small>
                  </el-form-item>
                </el-form>
              </el-card>

              <el-card header="2. 选课方案模板" class="panel-card template-card">
                <div
                  v-for="(template, index) in planTemplates"
                  :key="index"
                  class="plan-template"
                  role="group"
                  :aria-labelledby="`plan-template-title-${index}`"
                >
                  <div class="plan-template-header">
                    <strong :id="`plan-template-title-${index}`">
                      <span class="template-index">{{ index + 1 }}</span>方案模板
                    </strong>
                    <el-button
                      class="template-delete"
                      type="danger"
                      size="small"
                      text
                      @click="removeTemplate(index)"
                      :icon="Delete"
                      :aria-label="`删除方案模板 ${index + 1}`"
                    >删除</el-button>
                  </div>
                  <el-form :model="template" label-position="top" size="small" class="template-form">
                    <el-form-item label="开课周">
                      <el-input-number v-model="template.week" :min="1" :max="20" controls-position="right" />
                    </el-form-item>
                    <el-form-item label="开课星期">
                      <el-checkbox-group v-model="template.days">
                        <el-checkbox v-for="day in 7" :key="day" :label="day">{{ dayMap[day] }}</el-checkbox>
                      </el-checkbox-group>
                    </el-form-item>
                    <el-form-item label="课程规格">
                       <el-select v-model="template.periodType">
                        <el-option label="仅标准2节课 (1-2, 3-4...)" :value="1" />
                        <el-option label="任意2节课 (1-2, 2-3...)" :value="0" />
                        <el-option label="任意课程" :value="2" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="课程门数">
                      <el-input-number v-model="template.maxCourses" :min="1" :max="12" controls-position="right" />
                    </el-form-item>
                    <el-form-item>
                      <el-checkbox v-model="template.excludeEarlyPeriods">排除早八（第1-2节）</el-checkbox>
                    </el-form-item>
                    <el-form-item>
                      <el-checkbox v-model="template.excludeLatePeriods">排除晚课（第9-12节）</el-checkbox>
                    </el-form-item>
                  </el-form>
                </div>
                <div class="template-actions">
                  <el-button @click="addTemplate" :icon="Plus" plain>添加模板</el-button>
                  <el-button type="primary" @click="generatePlans" :disabled="loading" :icon="Promotion">
                    生成选课方案
                  </el-button>
                </div>
              </el-card>
            </el-col>
            
            <el-col :span="24" :lg="17">
              <CourseOverview
                :courses="processedCourses"
                :filtered-courses="filteredCourses"
                :update-time="jsonUpdateTime"
                :loading="loading"
                :load-error="courseLoadError"
                @file-selected="handleFileSelected"
                @refresh="fetchCourses(true)"
              />
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="生成的选课方案" name="results">
          <PlanResults
            :plans="generatedPlans"
            :empty-message="resultsEmptyMessage"
            v-model:active-plan-names="activePlanNames"
          />
        </el-tab-pane>

      </el-tabs>
    </el-main>

    <el-footer class="app-footer">
      <el-text><el-link href="https://github.com/Xuuyuan" target="_blank">@Xuuyuan Generated by Gemini</el-link> | <el-link href="https://github.com/Xuuyuan/gxhpy-choose-tools-frontend" target="_blank">GitHub</el-link></el-text>
    </el-footer>
  </el-container>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import { ElMessage } from 'element-plus';
import 'element-plus/es/components/message/style/css';
import { Delete, Plus, Promotion } from '@element-plus/icons-vue';
import CourseOverview from './components/CourseOverview.vue';
import PlanResults from './components/PlanResults.vue';
import { dayMap, prepareCourseData, parseExclusionTerms, areCourseListsEquivalent } from './courseData.js';
import {
  findOptimalCoursePlan,
  matchesPeriodType,
  overlapsEarlyPeriods,
  overlapsLatePeriods,
} from './coursePlanner.js';
import { fetchCoursePayload, formatCourseRequestError } from './courseService.js';
import { validatePlanConfiguration } from './planConfiguration.js';

// --- 状态定义 ---

const loading = ref(true);
const activeTab = ref('config');
const jsonUpdateTime = ref(''); // 存储更新时间
const courseLoadError = ref('');
const processedCourses = shallowRef([]); // 经过预处理的课程数据
const generatedPlans = shallowRef([]); // 生成的方案
const activePlanNames = ref([]);
const defaultResultsEmptyMessage = '请先配置并生成选课方案。';
const resultsEmptyMessage = ref(defaultResultsEmptyMessage);
const courseDataUrl = import.meta.env.VITE_COURSE_DATA_URL || '/gxhpy_classes.json';
let courseLoadSequence = 0;
let activeRemoteRequestController = null;
let activeFileReader = null;

const beginCourseLoad = ({ requestController = null, fileReader = null } = {}) => {
  courseLoadSequence += 1;
  const loadId = courseLoadSequence;
  const previousRequestController = activeRemoteRequestController;
  const previousFileReader = activeFileReader;

  activeRemoteRequestController = requestController;
  activeFileReader = fileReader;
  previousRequestController?.abort();
  if (previousFileReader?.readyState === 1) {
    previousFileReader.abort();
  }

  loading.value = true;
  courseLoadError.value = '';
  return loadId;
};

const isActiveCourseLoad = loadId => loadId === courseLoadSequence;

const finishCourseLoad = (loadId) => {
  if (!isActiveCourseLoad(loadId)) return;
  activeRemoteRequestController = null;
  activeFileReader = null;
  loading.value = false;
};

const filters = reactive({
  minRatio: 0.3,
  maxRatio: 10, // 报录比上限
  minCapacity: 90,
  selectedCampuses: ['旗山校区'], // 默认全选
  excludeOutdoorPrefix: '个性周-室外,东区,健美操馆',
  excludeCourseNames: '',
});

const cangshanPrefixes = ['文', '综', '田'];
const excludedLocations = computed(() => parseExclusionTerms(filters.excludeOutdoorPrefix));
const excludedNames = computed(() => parseExclusionTerms(filters.excludeCourseNames));
const filteredCourses = computed(() => {
  const excludeOutdoor = excludedLocations.value;
  const excludedCourseNames = new Set(excludedNames.value);
  const showQishan = filters.selectedCampuses.includes('旗山校区');
  const showCangshan = filters.selectedCampuses.includes('仓山校区');

  return processedCourses.value.filter(course => {
    if (course.parsed.ratio < filters.minRatio) return false;
    if (course.parsed.ratio > filters.maxRatio) return false;
    if (course.jxbrl < filters.minCapacity) return false;

    const location = course.jxdd || '';
    const isCangshan = cangshanPrefixes.some(prefix => location.startsWith(prefix));
    if (isCangshan && !showCangshan) return false;
    if (!isCangshan && !showQishan) return false;
    if (excludeOutdoor.some(prefix => location.startsWith(prefix))) return false;
    if (excludedCourseNames.has((course.kcmc || '').trim())) return false;

    return true;
  });
});

// 选课方案模板
const planTemplates = ref([
  // { week: 周数, periodType: 规格(0,1,2), days: [星期几], excludeEarlyPeriods: 是否排除早八, excludeLatePeriods: 是否排除晚课, maxCourses: 数量 }
  
  // 第一阶段（校级-第一轮）默认方案
  // { week: 10, periodType: 1, days: [1], maxCourses: 4 },
  // { week: 10, periodType: 2, days: [3], maxCourses: 4 },

  // 第二阶段（校级-第二轮）默认方案
  // { week: 10, periodType: 2, days: [4], maxCourses: 2 },
  // { week: 10, periodType: 2, days: [5], maxCourses: 2 },

  // 第三阶段（院级-第三轮）默认方案
  { week: 11, periodType: 0, days: [1], excludeEarlyPeriods: true, excludeLatePeriods: false, maxCourses: 3 },
  { week: 11, periodType: 0, days: [5], excludeEarlyPeriods: true, excludeLatePeriods: false, maxCourses: 3 },
]);

const invalidateGeneratedPlans = (
  message = '筛选条件或方案模板已修改，请重新生成选课方案。',
) => {
  generatedPlans.value = [];
  activePlanNames.value = [];
  resultsEmptyMessage.value = message;
};

watch(filters, () => invalidateGeneratedPlans(), { deep: true });
watch(planTemplates, () => invalidateGeneratedPlans(), { deep: true });

// --- 核心逻辑 (方案生成) ---

// 生成方案的主函数
const generatePlans = () => {
  if (loading.value) return;
  const validationError = validatePlanConfiguration(filters, planTemplates.value);
  if (validationError) {
    ElMessage.warning(validationError);
    activeTab.value = 'config';
    return;
  }

  invalidateGeneratedPlans();
  const baseCourses = filteredCourses.value;
  
  if (baseCourses.length === 0) {
    ElMessage.warning('没有满足基本筛选条件的课程，无法生成方案。');
    return;
  }
  
  const plans = [];
  const emptyTemplateNumbers = [];
  const underfilledTemplates = [];
  for (const [templateIndex, template] of planTemplates.value.entries()) {
    // 步骤 4.1: 根据模板筛选课程
    const templateFiltered = baseCourses.filter(c => {
      // 匹配周
      if (c.parsed.week !== template.week) return false;
      // 匹配天
      if (!template.days.includes(c.parsed.day)) return false;
      // 按模板排除与第1-2节重叠的早八课程
      if (template.excludeEarlyPeriods && overlapsEarlyPeriods(c)) return false;
      // 按模板排除与第9-12节重叠的晚课
      if (template.excludeLatePeriods && overlapsLatePeriods(c)) return false;
      
      return matchesPeriodType(c, template.periodType);
    });

    // 步骤 4.2: 精确搜索。先最大化课程门数，再最大化预计联合成功概率。
    const optimalPlan = findOptimalCoursePlan(templateFiltered, template.maxCourses);
    const selectedCourses = optimalPlan.courses;

    if (selectedCourses.length === 0) {
      emptyTemplateNumbers.push(templateIndex + 1);
    } else if (selectedCourses.length < template.maxCourses) {
      underfilledTemplates.push(
        `${templateIndex + 1}（${selectedCourses.length}/${template.maxCourses} 门）`,
      );
    }
    
    // 步骤 4.4: 排序并保存方案
    selectedCourses.sort((a, b) => {
      if (a.parsed.day !== b.parsed.day) return a.parsed.day - b.parsed.day;
      return a.parsed.startPeriod - b.parsed.startPeriod;
    });
    
    plans.push({
      template: { ...template },
      courses: selectedCourses,
      metrics: optimalPlan.metrics,
    });
  }

  if (emptyTemplateNumbers.length === plans.length) {
    resultsEmptyMessage.value = '当前配置无法生成方案，请调整筛选条件或模板。';
    ElMessage.warning('所有方案模板都没有可选课程，请调整筛选条件或模板。');
    return;
  }

  generatedPlans.value = plans;
  resultsEmptyMessage.value = '';

  const generationNotices = [];
  if (emptyTemplateNumbers.length > 0) {
    generationNotices.push(`模板 ${emptyTemplateNumbers.join('、')} 没有可选课程`);
  }
  if (underfilledTemplates.length > 0) {
    generationNotices.push(`模板 ${underfilledTemplates.join('、')} 未达到目标门数`);
  }

  if (generationNotices.length > 0) {
    const validPlanCount = plans.length - emptyTemplateNumbers.length;
    ElMessage.warning(`已处理 ${plans.length} 个模板，生成 ${validPlanCount} 个有效方案；${generationNotices.join('；')}。`);
  } else {
    ElMessage.success(`成功生成 ${plans.length} 个选课方案！`);
  }
  activeTab.value = 'results'; // 切换到结果标签页
  activePlanNames.value = plans.map((_, i) => i); // 默认展开所有
  nextTick(() => {
    document.querySelector('.app-tabs [role="tab"][aria-selected="true"]')?.focus();
  });
};

// --- 本地课程文件处理 ---
const handleFileSelected = (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  if (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json')) {
    event.target.value = '';
    ElMessage.warning('请选择一个 .json 文件');
    return;
  }

  const reader = new FileReader();
  const loadId = beginCourseLoad({ fileReader: reader });

  reader.onload = (e) => {
    setTimeout(() => {
      if (!isActiveCourseLoad(loadId)) return;

      try {
        const content = e.target.result;
        const data = JSON.parse(content);
        const preparedData = prepareCourseData(data?.courses);
        const hadGeneratedPlans = generatedPlans.value.length > 0;
        jsonUpdateTime.value = data.update_time || '本地上传';
        processedCourses.value = preparedData.courses;
        courseLoadError.value = '';
        invalidateGeneratedPlans(
          hadGeneratedPlans
            ? '课程数据已更换，原有方案已失效，请重新生成选课方案。'
            : defaultResultsEmptyMessage,
        );
        activeTab.value = 'config';

        const ignoredText = preparedData.rejectedCount > 0
          ? `，已忽略 ${preparedData.rejectedCount} 条无效记录`
          : '';
        ElMessage.success(`本地 JSON 文件加载成功${ignoredText}！`);
      } catch (error) {
        if (!isActiveCourseLoad(loadId)) return;
        console.error(error);
        courseLoadError.value = `本地文件解析失败：${error.message}`;
        ElMessage.error(courseLoadError.value);
      } finally {
        finishCourseLoad(loadId);
      }
    }, 0);
  };
  
  reader.onerror = () => {
    if (!isActiveCourseLoad(loadId)) return;
    courseLoadError.value = '读取本地文件失败';
    ElMessage.error(courseLoadError.value);
    finishCourseLoad(loadId);
  };

  reader.readAsText(file, 'UTF-8');
  event.target.value = '';
};


// --- 模板配置UI ---
const addTemplate = () => {
  planTemplates.value.push({
    week: 7,
    periodType: 0,
    days: [1, 2, 3, 4, 5],
    excludeEarlyPeriods: false,
    excludeLatePeriods: false,
    maxCourses: 8
  });
};

const removeTemplate = (index) => {
  planTemplates.value.splice(index, 1);
};


// --- 生命周期函数 ---
const fetchCourses = async (isManualRefresh = false) => {
  const requestController = new AbortController();
  const loadId = beginCourseLoad({ requestController });

  try {
    const data = await fetchCoursePayload({
      url: courseDataUrl,
      isManualRefresh,
      signal: requestController.signal,
    });
    if (!isActiveCourseLoad(loadId)) return;

    const preparedData = prepareCourseData(data.courses);
    const hasChanges = !areCourseListsEquivalent(processedCourses.value, preparedData.courses);
    const hadGeneratedPlans = generatedPlans.value.length > 0;
    jsonUpdateTime.value = data.update_time || '未知';
    if (hasChanges) {
      processedCourses.value = preparedData.courses;
      invalidateGeneratedPlans(
        hadGeneratedPlans
          ? '课程数据已更新，原有方案已失效，请重新生成选课方案。'
          : defaultResultsEmptyMessage,
      );
    }

    if (isManualRefresh) {
      const ignoredText = preparedData.rejectedCount > 0
        ? `，已忽略 ${preparedData.rejectedCount} 条无效记录`
        : '';
      ElMessage.success(
        !hasChanges
          ? `课程数据无变化${ignoredText}，已保留当前方案。`
          : hadGeneratedPlans
            ? `课程数据已刷新${ignoredText}，原有方案已失效，请重新生成。`
            : `课程数据已刷新${ignoredText}。`,
      );
    }
  } catch (error) {
    if (!isActiveCourseLoad(loadId) || error?.name === 'AbortError') return;
    console.error(error);
    courseLoadError.value = formatCourseRequestError(error);
    ElMessage.error(`加载课程数据失败：${courseLoadError.value}`);
  } finally {
    finishCourseLoad(loadId);
  }
};

onMounted(async () => {
  await fetchCourses(false);
});

</script>

<style>
html,
body,
#app {
  min-width: 320px;
  min-height: 100%;
  margin: 0;
}

body {
  background: #f4f7fb;
  color: #1f2937;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.app-shell {
  width: 100%;
  min-height: 100vh;
  --el-color-primary: #2563eb;
  --el-border-radius-base: 8px;
  background:
    radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.08), transparent 28%),
    #f4f7fb;
}

.app-header {
  height: 78px;
  padding: 0 28px;
  color: #fff;
  background: linear-gradient(120deg, #1d4ed8 0%, #2563eb 55%, #0ea5e9 100%);
  box-shadow: 0 8px 26px rgba(30, 64, 175, 0.2);
}

.app-header-content {
  display: flex;
  width: min(1680px, 100%);
  height: 100%;
  margin: 0 auto;
  align-items: center;
  gap: 14px;
}

.app-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
  font-size: 20px;
  font-weight: 700;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: 0.03em;
}

.app-subtitle {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
}

.app-main {
  width: min(1728px, 100%);
  margin: 0 auto;
  padding: 22px 24px 32px;
}

.workspace-grid > .el-col {
  min-width: 0;
}

.app-tabs > .el-tabs__header {
  margin: 0 0 18px;
  padding: 0 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 5px 18px rgba(15, 23, 42, 0.04);
}

.app-tabs > .el-tabs__header .el-tabs__nav-wrap::after {
  display: none;
}

.app-tabs .el-tabs__item {
  height: 48px;
  font-weight: 500;
}

.panel-card.el-card {
  margin-bottom: 20px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
}

.panel-card > .el-card__header {
  padding: 18px 20px;
  border-bottom-color: #edf2f7;
  color: #0f172a;
  font-size: 16px;
  font-weight: 650;
}

.panel-card > .el-card__body {
  padding: 20px;
}

.filter-card .el-form-item {
  margin-bottom: 18px;
}

.filter-card .el-form-item__label,
.template-form .el-form-item__label {
  color: #475569;
  font-weight: 500;
}

.template-card {
  margin-top: 0;
}

.plan-template {
  margin-bottom: 14px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: linear-gradient(180deg, #fbfdff, #f8fafc);
}

.plan-template-header {
  display: flex;
  margin-bottom: 14px;
  align-items: center;
  justify-content: space-between;
}

.plan-template-header strong {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
  font-size: 14px;
}

.template-index {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 8px;
  color: #1d4ed8;
  background: #dbeafe;
  font-size: 12px;
  font-weight: 700;
}

.template-delete {
  margin-left: auto;
}

.template-form .el-form-item {
  margin-bottom: 14px;
}

.template-form .el-form-item:last-child {
  margin-bottom: 0;
}

.template-form .el-input-number,
.template-form .el-select {
  width: 100%;
}

.plan-template .el-checkbox-group {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  width: 100%;
  gap: 6px 2px;
}

.plan-template .el-checkbox-group .el-checkbox {
  width: auto;
  margin-right: 0;
}

.template-actions {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 10px;
}

.template-actions .el-button {
  width: 100%;
  margin: 0;
}

.app-footer {
  height: auto;
  padding: 6px 16px 22px;
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
}

.filter-label-with-tooltip {
  cursor: help;
  text-decoration: underline dotted var(--el-text-color-placeholder);
  text-underline-offset: 3px;
}
.filter-recognized {
  color: #64748b;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.filter-tooltip {
  max-width: 340px;
  line-height: 1.6;
}
@media (max-width: 767px) {
  .app-header {
    height: 64px;
    padding: 0 16px;
  }

  .app-mark {
    width: 36px;
    height: 36px;
    border-radius: 11px;
    font-size: 17px;
  }

  .app-title {
    font-size: 17px;
  }

  .app-subtitle {
    display: none;
  }

  .app-main {
    padding: 14px 12px 24px;
  }

  .app-tabs > .el-tabs__header {
    margin-bottom: 14px;
    padding: 0 8px;
  }

  .app-tabs .el-tabs__item {
    height: 44px;
    padding: 0 12px;
    font-size: 13px;
  }

  .panel-card.el-card {
    margin-bottom: 14px;
    border-radius: 12px;
  }

  .panel-card > .el-card__header,
  .panel-card > .el-card__body {
    padding: 16px;
  }

  .plan-template {
    padding: 14px;
  }

  .plan-template .el-checkbox-group {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .responsive-checkbox-group {
    display: flex;
    flex-direction: column;
  }
  .responsive-checkbox-group .el-checkbox {
    width: auto;
    margin-right: 0;
  }

  .template-actions {
    grid-template-columns: 1fr;
  }

}
</style>
