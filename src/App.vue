<template>
  <el-container class="app-shell">
    
    <el-header class="app-header">
      <div class="app-header-content">
        <div class="app-mark">优</div>
        <div>
          <div class="app-title">个性化培养周选课工具</div>
          <div class="app-subtitle">课程筛选与低报录比方案生成</div>
        </div>
      </div>
    </el-header>

    <el-main v-loading="loading" element-loading-text="正在加载课程数据..." class="app-main">
      <el-tabs v-model="activeTab" class="app-tabs">
        
        <el-tab-pane label="课程筛选与方案配置" name="config">
          <el-row :gutter="24" class="workspace-grid">
            <el-col :span="24" :md="8">
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

                  <el-form-item label="[排除] 特定地点 (英文逗号分隔)">
                    <template #label>
                      <el-tooltip
                        content="排除特定地点可以避免选取到室外或特殊教学楼课程"
                        placement="top"
                        :show-after="200"
                        popper-class="filter-tooltip"
                      >
                        <span class="filter-label-with-tooltip" tabindex="0">[排除] 特定地点 (英文逗号分隔)</span>
                      </el-tooltip>
                    </template>
                    <el-input v-model="filters.excludeOutdoorPrefix" placeholder="个性周-室外,东区,健美操馆" />
                  </el-form-item>

                  <el-form-item label="[排除] 特定课程名称 (英文逗号分隔)">
                    <template #label>
                      <el-tooltip
                        content="排除特定课程名称为备选项，用于避免抓取的课程列表含面向特定学院的开课而导致无法正常选课问题"
                        placement="top"
                        :show-after="200"
                        popper-class="filter-tooltip"
                      >
                        <span class="filter-label-with-tooltip" tabindex="0">[排除] 特定课程名称 (英文逗号分隔)</span>
                      </el-tooltip>
                    </template>
                    <el-input
                      v-model="filters.excludeCourseNames"
                      placeholder="课程名称A,课程名称B"
                      clearable
                    />
                  </el-form-item>
                </el-form>
              </el-card>

              <el-card header="2. 选课方案模板" class="panel-card template-card">
                <div v-for="(template, index) in planTemplates" :key="index" class="plan-template">
                  <div class="plan-template-header">
                    <strong><span class="template-index">{{ index + 1 }}</span>方案模板</strong>
                    <el-button
                      class="template-delete"
                      type="danger"
                      size="small"
                      text
                      @click="removeTemplate(index)"
                      :icon="Delete"
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
                        <el-option label="任意2节课 (不含1-2)" :value="2" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="课程门数">
                      <el-input-number v-model="template.maxCourses" :min="1" :max="12" controls-position="right" />
                    </el-form-item>
                    <el-form-item>
                      <el-checkbox v-model="template.excludeLatePeriods">排除晚课（第9-12节）</el-checkbox>
                    </el-form-item>
                  </el-form>
                </div>
                <div class="template-actions">
                  <el-button @click="addTemplate" :icon="Plus" plain>添加模板</el-button>
                  <el-button type="primary" @click="generatePlans" :icon="Promotion">
                    生成选课方案
                  </el-button>
                </div>
              </el-card>
            </el-col>
            
            <el-col :span="24" :md="16">
              <el-card class="panel-card course-overview-card">
                <template #header>
                  <div class="course-toolbar">
                    <div class="course-toolbar-title">
                      <strong>课程总览</strong>
                      <span class="course-count">{{ filteredCourses.length }} / {{ processedCourses.length }}</span>
                      <small v-if="jsonUpdateTime">更新于 {{ jsonUpdateTime }}</small>
                    </div>
                    
                    <div class="course-toolbar-actions">
                      <el-link type="warning" href="./get_classes.zip" :icon="Download" target="_blank">下载脚本</el-link>
                      
                      <input 
                        ref="fileInput"
                        type="file" 
                        accept=".json" 
                        style="display: none;" 
                        @change="handleFileSelected"
                      />
                      
                      <el-button 
                        type="primary" 
                        :icon="Upload" 
                        plain 
                        @click="triggerFileInput"
                      >
                        上传JSON
                      </el-button>
                      
                      <el-button
                        type="primary"
                        :icon="Refresh"
                        circle
                        :loading="loading"
                        @click="() => fetchCourses(true)"
                      />
                    </div>
                  </div>
                </template>
                  <div class="main-course-table">
                    <el-auto-resizer>
                      <template #default="{ height, width }">
                        <el-table-v2
                          :columns="courseTableColumns"
                          :data="sortedFilteredCourses"
                          :width="width"
                          :height="height"
                          :row-height="50"
                          :header-height="50"
                          :sort-by="courseSort"
                          :row-class="courseTableRowClass"
                          row-key="virtualRowKey"
                          fixed
                          scrollbar-always-on
                          @column-sort="handleCourseSort"
                        >
                          <template #empty>
                            <el-empty :image-size="96" class="course-table-empty">
                              <template #description>
                                <p class="course-table-empty-title">
                                  {{ processedCourses.length === 0
                                    ? '暂未获取到课程列表'
                                    : '没有符合筛选条件的课程' }}
                                </p>
                                <p class="course-table-empty-hint">
                                  {{ processedCourses.length === 0
                                    ? '请点击右上角刷新，或上传本地 JSON 文件'
                                    : '请尝试调整报录比、容量、校区、地点或课程名称条件' }}
                                </p>
                              </template>
                            </el-empty>
                          </template>
                        </el-table-v2>
                      </template>
                    </el-auto-resizer>
                  </div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="生成的选课方案" name="results">
          <div v-if="generatedPlans.length === 0" class="result-empty">
            请先在“课程筛选与方案配置”标签页中配置并点击“生成选课方案”
          </div>
          <el-collapse v-model="activePlanNames">
            <el-collapse-item 
              v-for="(plan, index) in generatedPlans" 
              :key="index"
              :name="index"
              :title="`方案 ${index + 1} (模板: 周${plan.template.week}, 天[${plan.template.days.join(',')}], 规格${plan.template.periodType}) - 共 ${plan.courses.length} 门，估算全选成功率 ${formatProbability(plan.metrics.jointProbability)}`">
              
              <el-table :data="plan.courses" stripe border class="plan-result-table">
                <el-table-column type="index" width="50" />
                <el-table-column prop="kcmc" label="课程名称" min-width="180" />
                <el-table-column prop="jsxx" label="教师信息" width="150" />
                <el-table-column prop="sksj" label="上课时间" width="180" />
                <el-table-column prop="jxdd" label="上课地点" width="150" />
                <el-table-column label="已选/容量" width="100">
                  <template #default="{ row }">
                    {{ row.yxrs }}/{{ row.jxbrl }}
                  </template>
                </el-table-column>
                <el-table-column label="报录比" width="100">
                  <template #default="{ row }">
                    {{ (row.parsed.ratio || 0).toFixed(2) }}
                  </template>
                </el-table-column>
              </el-table>

            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>

      </el-tabs>
    </el-main>

    <el-footer class="app-footer">
      <el-text><el-link href="https://github.com/Xuuyuan" target="_blank">@Xuuyuan Generated by Gemini</el-link> | <el-link href="https://github.com/Xuuyuan/gxhpy-choose-tools-frontend" target="_blank">GitHub</el-link></el-text>
    </el-footer>
  </el-container>
</template>

<script setup>
import { computed, h, onMounted, reactive, ref, shallowRef } from 'vue';
import { ElIcon, ElMessage, TableV2SortOrder } from 'element-plus';
import 'element-plus/es/components/icon/style/css';
import 'element-plus/es/components/message/style/css';
import { Delete, Plus, Promotion, Refresh, Upload, Download } from '@element-plus/icons-vue';
import { View, Hide } from '@element-plus/icons-vue'
import {
  findOptimalCoursePlan,
  matchesPeriodType,
  overlapsLatePeriods,
} from './coursePlanner.js';

// --- 状态定义 ---

const loading = ref(true);
const activeTab = ref('config');
const jsonUpdateTime = ref(''); // 存储更新时间
const processedCourses = shallowRef([]); // 经过预处理的课程数据
const generatedPlans = shallowRef([]); // 生成的方案
const activePlanNames = ref([0]); // 默认展开第一个方案
const showFullTeacherInfo = ref(false) // 教师信息显示

// 【新增】: 创建一个 ref 来引用原生的 input
const fileInput = ref(null);
const courseDataUrl = 'https://oss.nekoark.com/gxhpy_classes.json';

const filters = reactive({
  minRatio: 0.3,
  maxRatio: 10, // 报录比上限
  minCapacity: 90,
  selectedCampuses: ['旗山校区'], // 默认全选
  excludeOutdoorPrefix: '个性周-室外,东区,健美操馆',
  excludeCourseNames: '',
});

const cangshanPrefixes = ['文', '综', '田'];
const filteredCourses = computed(() => {
  const excludeOutdoor = filters.excludeOutdoorPrefix.split(',').filter(Boolean);
  const excludedCourseNames = new Set(
    filters.excludeCourseNames
      .split(',')
      .map(courseName => courseName.trim())
      .filter(Boolean),
  );
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

// 课程总览排序状态；默认保持原表格按报录比降序的行为
const courseSort = ref({
  key: 'ratio',
  order: TableV2SortOrder.DESC,
});

// 星期映射
const dayMap = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' };
const dayMapReverse = {
  '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 7
};

const getTeacherDisplayName = (teacherInfo) => {
  if (!teacherInfo) return '';
  const parts = teacherInfo.split('/');
  return parts.length > 1 ? parts[1] : teacherInfo;
};

const formatProbability = (probability) => `${(probability * 100).toFixed(2)}%`;

const renderTextCell = (text, title = text) => h(
  'span',
  {
    class: 'course-table-cell-text',
    title: title == null ? '' : String(title),
  },
  text == null ? '' : String(text),
);

const courseTableColumns = [
  {
    key: 'kcmc',
    dataKey: 'kcmc',
    title: '课程名称',
    width: 180,
    flexGrow: 1,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.kcmc),
  },
  {
    key: 'jsxx',
    dataKey: 'jsxx',
    title: '教师',
    width: 110,
    headerCellRenderer: () => h(
      'div',
      { class: 'teacher-column-header' },
      [
        h('span', '教师'),
        h(
          ElIcon,
          {
            class: 'teacher-info-toggle',
            title: showFullTeacherInfo.value ? '隐藏完整教师信息' : '显示完整教师信息',
            onClick: () => {
              showFullTeacherInfo.value = !showFullTeacherInfo.value;
            },
          },
          { default: () => h(showFullTeacherInfo.value ? View : Hide) },
        ),
      ],
    ),
    cellRenderer: ({ rowData }) => renderTextCell(
      showFullTeacherInfo.value ? rowData.jsxx : rowData.display.teacherName,
      rowData.jsxx,
    ),
  },
  {
    key: 'sksj',
    dataKey: 'sksj',
    title: '上课时间',
    width: 200,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.sksj),
  },
  {
    key: 'jxdd',
    dataKey: 'jxdd',
    title: '上课地点',
    width: 120,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.jxdd),
  },
  {
    key: 'yxrs',
    dataKey: 'yxrs',
    title: '已选/容量',
    width: 110,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.display.selectedCapacity),
  },
  {
    key: 'ratio',
    dataKey: 'ratio',
    title: '报录比',
    width: 90,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.display.ratio),
  },
  {
    key: 'week',
    dataKey: 'week',
    title: '周',
    width: 70,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.parsed.week),
  },
  {
    key: 'day',
    dataKey: 'day',
    title: '天',
    width: 70,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.display.day),
  },
  {
    key: 'startPeriod',
    dataKey: 'startPeriod',
    title: '节',
    width: 70,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.display.period),
  },
];

const courseSortValueGetters = {
  yxrs: course => course.yxrs,
  ratio: course => course.parsed.ratio,
  week: course => course.parsed.week,
  day: course => course.parsed.day,
  startPeriod: course => course.parsed.startPeriod,
};

const sortedFilteredCourses = computed(() => {
  const valueGetter = courseSortValueGetters[courseSort.value.key];
  if (!valueGetter) return filteredCourses.value;

  const direction = courseSort.value.order === TableV2SortOrder.ASC ? 1 : -1;
  return [...filteredCourses.value].sort((courseA, courseB) => {
    const valueA = valueGetter(courseA);
    const valueB = valueGetter(courseB);
    return (valueA - valueB) * direction;
  });
});

const handleCourseSort = ({ key, order }) => {
  courseSort.value = { key, order };
};

const courseTableRowClass = ({ rowIndex }) => (
  rowIndex % 2 === 1 ? 'course-table-row--striped' : ''
);

// 选课方案模板
const planTemplates = ref([
  // { week: 周数, periodType: 规格(0,1,2), days: [星期几], excludeLatePeriods: 是否排除晚课, maxCourses: 数量 }
  
  // 第一阶段（校级-第一轮）默认方案
  // { week: 10, periodType: 1, days: [1], maxCourses: 4 },
  // { week: 10, periodType: 2, days: [3], maxCourses: 4 },

  // 第二阶段（校级-第二轮）默认方案
  // { week: 10, periodType: 2, days: [4], maxCourses: 2 },
  // { week: 10, periodType: 2, days: [5], maxCourses: 2 },

  // 第三阶段（院级-第三轮）默认方案
  { week: 11, periodType: 2, days: [1], excludeLatePeriods: false, maxCourses: 3 },
  { week: 11, periodType: 2, days: [5], excludeLatePeriods: false, maxCourses: 3 },
]);

// --- 辅助函数 (数据预处理) ---

// 提取周数: {7周} -> 7
const parseWeek = (sksj) => {
  const match = sksj.match(/\{(\d+)周\}/);
  return match ? parseInt(match[1], 10) : null;
};

// 提取天: 星期一 -> 1
const parseDay = (sksj) => {
  for (const [key, value] of Object.entries(dayMapReverse)) {
    if (sksj.includes(key)) {
      return value;
    }
  }
  return null;
};

// 提取开始节: 第1-2节 -> 1
const parseStartPeriod = (sksj) => {
  const match = sksj.match(/第(\d+)-\d+节/);
  return match ? parseInt(match[1], 10) : null;
};

// 提取结束节: 第1-2节 -> 2
const parseEndPeriod = (sksj) => {
  const match = sksj.match(/第\d+-(\d+)节/);
  return match ? parseInt(match[1], 10) : null;
};

// 预处理所有课程
const preprocessCourses = (courses) => {
  return courses
    .map((course, index) => {
      const jxbrl = parseInt(course.jxbrl, 10);
      const yxrs = parseInt(course.yxrs, 10);
      const week = parseWeek(course.sksj);
      const day = parseDay(course.sksj);
      const startPeriod = parseStartPeriod(course.sksj);
      const endPeriod = parseEndPeriod(course.sksj);

      // 只有所有时间信息都解析成功才认为是有效课程
      if (week === null || day === null || startPeriod === null || endPeriod === null || isNaN(jxbrl) || isNaN(yxrs)) {
        return null;
      }
      
      const ratio = (jxbrl > 0) ? (yxrs / jxbrl) : (yxrs > 0 ? 999 : 0); // 避免除以0

      return {
        ...course,
        virtualRowKey: course.jxb_id || `${course.kcmc}-${course.sksj}-${index}`,
        jxbrl, // 确保是数字
        yxrs,  // 确保是数字
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
        }
      };
    })
    .filter(course => course !== null); // 过滤掉解析失败的课程
};

// --- 核心逻辑 (方案生成) ---

// 生成方案的主函数
const generatePlans = () => {
  generatedPlans.value = [];
  const baseCourses = filteredCourses.value; 
  
  if (baseCourses.length === 0) {
    ElMessage.warning('没有满足基本筛选条件的课程，无法生成方案。');
    return;
  }
  
  const plans = [];
  for (const template of planTemplates.value) {
    // 步骤 4.1: 根据模板筛选课程
    let templateFiltered = baseCourses.filter(c => {
      // 匹配周
      if (c.parsed.week !== template.week) return false;
      // 匹配天
      if (!template.days.includes(c.parsed.day)) return false;
      // 按模板排除与第9-12节重叠的晚课
      if (template.excludeLatePeriods && overlapsLatePeriods(c)) return false;
      
      return matchesPeriodType(c, template.periodType);
    });

    // 步骤 4.2: 精确搜索。先最大化课程门数，再最大化预计联合成功概率。
    const optimalPlan = findOptimalCoursePlan(templateFiltered, template.maxCourses);
    const selectedCourses = optimalPlan.courses;
    
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

  generatedPlans.value = plans;
  
  ElMessage.success(`成功生成 ${plans.length} 个选课方案！`);
  activeTab.value = 'results'; // 切换到结果标签页
  activePlanNames.value = plans.map((_, i) => i); // 默认展开所有
};

// --- 【修改】: 文件处理 ---

// 【新增】: 触发原生 input 点击的函数
const triggerFileInput = () => {
  fileInput.value.click();
};

// 【修改】: 将 handleFileChange 的逻辑迁移到新函数，并改为接收原生事件
const handleFileSelected = (event) => {
  const file = event.target.files[0]; // 从原生事件获取文件
  if (!file) {
    return; // 用户点击了取消
  }

  if (!file.type.includes('json') && !file.name.endsWith('.json')) {
    ElMessage.warning('请选择一个.json文件');
    return;
  }

  loading.value = true; // 显示加载动画
  const reader = new FileReader();

  reader.onload = (e) => {
    setTimeout(() => {
      try {
        const content = e.target.result;
        const data = JSON.parse(content);

        if (data && data.courses) {
          jsonUpdateTime.value = '本地上传';
          processedCourses.value = preprocessCourses(data.courses);
          
          ElMessage.success('本地JSON文件加载成功！');
          
          generatedPlans.value = [];
          activeTab.value = 'config';

        } else {
          throw new Error("JSON数据格式不正确, 缺少 'courses' 键。");
        }
      } catch (error) {
        console.error(error);
        ElMessage.error(`文件解析失败: ${error.message}`);
      } finally {
        loading.value = false; // 结束加载
      }
    }, 0); 
  };
  
  reader.onerror = () => {
      ElMessage.error('读取文件失败。');
      loading.value = false;
  }

  reader.readAsText(file, 'UTF-8');

  event.target.value = null;
};


// --- 模板配置UI ---
const addTemplate = () => {
  planTemplates.value.push({
    week: 7,
    periodType: 0,
    days: [1, 2, 3, 4, 5],
    excludeLatePeriods: false,
    maxCourses: 8
  });
};

const removeTemplate = (index) => {
  planTemplates.value.splice(index, 1);
};


// --- 生命周期函数 ---
const fetchCourses = async (isManualRefresh = false) => {
  try {
    loading.value = true;

    const requestUrl = isManualRefresh
      ? `${courseDataUrl}?t=${Date.now()}`
      : courseDataUrl;
    const response = await fetch(requestUrl, {
      cache: isManualRefresh ? 'no-store' : 'default',
    });

    if (!response.ok) {
      throw new Error(`请求失败 (${response.status})`);
    }

    const data = await response.json();
    
    if (data && data.courses) {
      // 从网络获取时，正常显示更新时间
      jsonUpdateTime.value = data.update_time || '未知';
      processedCourses.value = preprocessCourses(data.courses);

      if (isManualRefresh) {
        ElMessage.success('课程数据已刷新！');
      }
      
    } else {
      throw new Error("JSON数据格式不正确");
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(`加载课程数据失败: ${error.message}.`);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  document.title = '个性化培养周选课工具';
  await fetchCourses(false); // 页面加载时获取数据并应用筛选
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
  width: min(1440px, 100%);
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
  width: min(1488px, 100%);
  margin: 0 auto;
  padding: 22px 24px 32px;
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

.course-overview-card > .el-card__body {
  padding: 0 20px 20px;
}

.course-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.course-toolbar-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.course-toolbar-title strong {
  color: #0f172a;
  font-size: 16px;
}

.course-toolbar-title small {
  overflow: hidden;
  color: #94a3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-count {
  padding: 3px 9px;
  border-radius: 999px;
  color: #1d4ed8;
  background: #eff6ff;
  font-size: 12px;
  font-weight: 650;
}

.course-toolbar-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

.result-empty {
  padding: 72px 24px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.78);
  text-align: center;
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
.filter-tooltip {
  max-width: 340px;
  line-height: 1.6;
}
.main-course-table {
  height: 580px;
  width: 100%;
}
.course-table-cell-text {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.teacher-column-header {
  display: flex;
  align-items: center;
  gap: 5px;
}
.teacher-info-toggle {
  cursor: pointer;
}
.course-table-row--striped {
  background-color: #f8fafc;
}
.main-course-table .el-table-v2__empty {
  display: flex;
  height: calc(100% - 50px);
  align-items: center;
  justify-content: center;
}
.course-table-empty {
  width: min(420px, calc(100% - 32px));
  margin: 0 auto;
  padding: 24px 20px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fafc, #fff);
}
.course-table-empty .el-empty__image {
  opacity: 0.8;
}
.course-table-empty .el-empty__description {
  margin-top: 14px;
}
.course-table-empty-title {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
}
.course-table-empty-hint {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
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

  .main-course-table {
    height: 430px;
  }

  /* 修复表格在移动端显示不全的问题，允许横向滚动 */
  .plan-result-table .el-table__body-wrapper {
    overflow-x: auto;
  }

  .course-overview-card > .el-card__body {
    padding: 0 12px 12px;
  }

  .course-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .course-toolbar-title {
    width: 100%;
  }

  .course-toolbar-title small {
    margin-left: auto;
  }

  .course-toolbar-actions {
    width: 100%;
    justify-content: flex-end;
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
