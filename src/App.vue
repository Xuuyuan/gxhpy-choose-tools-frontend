<template>
  <el-container style="min-height: 100vh; width: 100%;">
    
    <el-header class="app-header">
      个性化培养周选课工具
    </el-header>

    <el-main v-loading="loading" element-loading-text="正在加载课程数据..." class="app-main">
      <el-tabs v-model="activeTab">
        
        <el-tab-pane label="课程筛选与方案配置" name="config">
          <el-row :gutter="20">
            <el-col :span="24" :md="8">
              <el-card header="1. 基本筛选条件">
                <el-form :model="filters" label-position="top">

                  <el-row :gutter="20">
                    <el-col :span="24" :md="12">
                      <el-form-item label="最低报录比 (已选/容量)">
                        <el-input-number v-model="filters.minRatio" :min="0" :max="20" :step="0.1" controls-position="right" style="width: 100%;" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="24" :md="12">
                      <el-form-item label="最高报录比 (已选/容量)">
                        <el-input-number v-model="filters.maxRatio" :min="0" :max="20" :step="0.1" controls-position="right" style="width: 100%;" />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="20">
                    <el-col :span="24" :md="12">
                      <el-form-item label="最低教学班容量">
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
                    <el-input v-model="filters.excludeOutdoorPrefix" placeholder="个性周-室外,东区,健美操馆" />
                  </el-form-item>
                </el-form>
              </el-card>

              <el-card header="2. 选课方案模板" style="margin-top: 20px;">
                <div v-for="(template, index) in planTemplates" :key="index" class="plan-template">
                  <strong>模板 {{ index + 1 }}</strong>
                  <el-form :model="template" label-width="80px" size="small">
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
                  </el-form>
                  <el-button type="danger" size="small" @click="removeTemplate(index)" circle :icon="Delete" />
                </div>
                <el-button type="primary" @click="addTemplate" :icon="Plus" round>添加方案模板</el-button>
                <el-button type="success" @click="generatePlans" :icon="Promotion" round style="margin-top: 10px; width: 100%;">
                  生成选课方案
                </el-button>
              </el-card>
            </el-col>
            
            <el-col :span="24" :md="16">
              <el-card>
                <template #header>
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <span>
                      课程总览 ({{ filteredCourses.length }}/{{ processedCourses.length }})
                      <span v-if="jsonUpdateTime"> → 更新于 {{ jsonUpdateTime }}</span>
                    </span>
                    
                    <div style="display: flex; align-items: center; gap: 10px;">
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
                            <div class="course-table-empty">暂无数据</div>
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
          <div v-if="generatedPlans.length === 0" style="text-align: center; color: #999; padding: 40px;">
            请先在“课程筛选与方案配置”标签页中配置并点击“生成选课方案”
          </div>
          <el-collapse v-model="activePlanNames">
            <el-collapse-item 
              v-for="(plan, index) in generatedPlans" 
              :key="index"
              :name="index"
              :title="`方案 ${index + 1} (模板: 周${plan.template.week}, 天[${plan.template.days.join(',')}], 规格${plan.template.periodType}) - 共 ${plan.courses.length} 门`">
              
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

    <el-footer style="text-align: center; padding: 10px; font-size: 12px; color: #888;">
      <el-text><el-link href="https://github.com/Xuuyuan" target="_blank">@Xuuyuan Generated by Gemini</el-link> | <el-link href="https://github.com/Xuuyuan/gxhpy-choose-tools-frontend" target="_blank">GitHub</el-link></el-text>
    </el-footer>
  </el-container>
</template>

<script setup>
// 导入 watch 用于响应式筛选
import { computed, h, ref, reactive, onMounted, watch } from 'vue';
import axios from 'axios';
import { ElIcon, ElMessage, TableV2SortOrder } from 'element-plus';
import { Delete, Plus, Promotion, Refresh, Upload, Download } from '@element-plus/icons-vue';
import { View, Hide } from '@element-plus/icons-vue'

// --- 状态定义 ---

const loading = ref(true);
const activeTab = ref('config');
const allCourses = ref([]); // 原始课程数据
const jsonUpdateTime = ref(''); // 存储更新时间
const processedCourses = ref([]); // 经过预处理的课程数据
const generatedPlans = ref([]); // 生成的方案
const activePlanNames = ref([0]); // 默认展开第一个方案
const showFullTeacherInfo = ref(false) // 教师信息显示

// 【新增】: 创建一个 ref 来引用原生的 input
const fileInput = ref(null);

const filters = reactive({
  minRatio: 0.3,
  maxRatio: 10, // 报录比上限
  minCapacity: 90,
  selectedCampuses: ['旗山校区'], // 默认全选
  excludeOutdoorPrefix: '个性周-室外,东区,健美操馆',
});

// 【关键修改】: 将 filteredCourses 从 computed 改为 ref
const filteredCourses = ref([]);

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
      showFullTeacherInfo.value ? rowData.jsxx : getTeacherDisplayName(rowData.jsxx),
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
    cellRenderer: ({ rowData }) => renderTextCell(`${rowData.yxrs}/${rowData.jxbrl}`),
  },
  {
    key: 'ratio',
    dataKey: 'ratio',
    title: '报录比',
    width: 90,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell((rowData.parsed.ratio || 0).toFixed(2)),
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
    cellRenderer: ({ rowData }) => renderTextCell(dayMap[rowData.parsed.day]),
  },
  {
    key: 'startPeriod',
    dataKey: 'startPeriod',
    title: '节',
    width: 70,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(
      `${rowData.parsed.startPeriod}-${rowData.parsed.endPeriod}`,
    ),
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
  // { week: 周数, periodType: 规格(0,1,2), days: [星期几], maxCourses: 数量 }
  
  // 第一阶段（校级-第一轮）默认方案
  // { week: 10, periodType: 1, days: [1], maxCourses: 4 },
  // { week: 10, periodType: 2, days: [3], maxCourses: 4 },

  // 第二阶段（校级-第二轮）默认方案
  // { week: 10, periodType: 2, days: [4], maxCourses: 2 },
  // { week: 10, periodType: 2, days: [5], maxCourses: 2 },

  // 第三阶段（院级-第三轮）默认方案
  { week: 11, periodType: 2, days: [1], maxCourses: 3 },
  { week: 11, periodType: 2, days: [5], maxCourses: 3 },
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
      if (week === null || day === null || startPeriod === null || endPeriod === null || isNaN(jxbrl) || isNaN(jxbrl)) {
        return null;
      }
      
      const ratio = (jxbrl > 0) ? (yxrs / jxbrl) : (yxrs > 0 ? 999 : 0); // 避免除以0

      return {
        ...course,
        virtualRowKey: course.jxb_id || `${course.kcmc}-${course.sksj}-${index}`,
        jxbrl, // 确保是数字
        yxrs,  // 确保是数字
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

// --- 【关键修改】: 新增一个手动应用筛选的函数 ---
const applyFilters = () => {
  if (!processedCourses.value || processedCourses.value.length === 0) {
    filteredCourses.value = [];
    return;
  }
  
  const cangshanPrefixes = ['文', '综', '田'];
  const excludeOutdoor = filters.excludeOutdoorPrefix.split(',').filter(Boolean);
  
  // 将原 computed 的逻辑搬到这里
  filteredCourses.value = processedCourses.value.filter(c => {
    if (c.parsed.ratio < filters.minRatio) return false;
    if (c.parsed.ratio > filters.maxRatio) return false; // 过滤超过上限的
    
    if (c.jxbrl <= filters.minCapacity) return false;
    
    const location = c.jxdd || ''; // 确保地点不是null
    const isCangshan = cangshanPrefixes.some(prefix => location.startsWith(prefix));
    const isQishan = !isCangshan;

    const showQishan = filters.selectedCampuses.includes('旗山校区');
    const showCangshan = filters.selectedCampuses.includes('仓山校区');

    // 如果是旗山课程，但用户不想看旗山，则过滤
    if (isQishan && !showQishan) return false;
    // 如果是仓山课程，但用户不想看仓山，则过滤
    if (isCangshan && !showCangshan) return false;
    
    // 室外排除 (这个逻辑保留)
    if (excludeOutdoor.some(prefix => location.startsWith(prefix))) return false;
    
    return true;
  });
};

// 【关键修改】: 监听筛选条件的变化，并手动调用 applyFilters
watch(filters, () => {
  applyFilters();
}, { 
  deep: true // 确保能监听到 reactive 对象内部的变化
});

// --- 核心逻辑 (方案生成) ---

// 2. 检查课程是否满足 "标准2节课"
const isStandardPeriod = (start, end) => {
  return (start === 1 && end === 2) ||
         (start === 3 && end === 4) ||
         (start === 5 && end === 6) ||
         (start === 7 && end === 8) ||
         (start === 9 && end === 10) ||
         (start === 11 && end === 12);
};

// 3. 检查两门课是否冲突
const checkConflict = (courseA, courseB) => {
  // 课程名称相同
  if (courseA.kcmc === courseB.kcmc) return true;
  
  const pA = courseA.parsed;
  const pB = courseB.parsed;

  // 周或天不同，不冲突
  if (pA.week !== pB.week || pA.day !== pB.day) {
    return false;
  }
  
  // 时间不重叠: A在B前 或 A在B后
  const noOverlap = (pA.endPeriod < pB.startPeriod) || (pA.startPeriod > pB.endPeriod);
  
  return !noOverlap; // 重叠则冲突
};

// 4. 生成方案的主函数
const generatePlans = () => {
  generatedPlans.value = [];
  // 【注意】: 确保这里使用的是已经手动筛选过的 filteredCourses.value
  const baseCourses = filteredCourses.value; 
  
  if (baseCourses.length === 0) {
    ElMessage.warning('没有满足基本筛选条件的课程，无法生成方案。');
    return;
  }
  
  for (const template of planTemplates.value) {
    // 步骤 4.1: 根据模板筛选课程
    let templateFiltered = baseCourses.filter(c => {
      // 匹配周
      if (c.parsed.week !== template.week) return false;
      // 匹配天
      if (!template.days.includes(c.parsed.day)) return false;
      
      // 匹配课程规格
      const duration = c.parsed.endPeriod - c.parsed.startPeriod;
      if (template.periodType === 1) { // 仅标准2节课
        return isStandardPeriod(c.parsed.startPeriod, c.parsed.endPeriod);
      } else if (template.periodType === 0) { // 任意2节课
        return duration <= 1; // 1-2, 2-3 都是 1
      } else if (template.periodType === 2) { // 任意2节课 (不含1-2)
        return duration <= 1 && c.parsed.startPeriod !== 1;
      }
      return false;
    });
    
    // 步骤 4.2: 排序 (按报录比从低到高，优先选报的人少的)
    templateFiltered.sort((a, b) => a.parsed.ratio - b.parsed.ratio);
    
    // 步骤 4.3: 贪心算法填充
    const selectedCourses = [];
    for (const course of templateFiltered) {
      if (selectedCourses.length >= template.maxCourses) {
        break; // 达到本方案最大课程数
      }
      
      let hasConflict = false;
      for (const selected of selectedCourses) {
        if (checkConflict(course, selected)) {
          hasConflict = true;
          break;
        }
      }
      
      if (!hasConflict) {
        selectedCourses.push(course);
      }
    }
    
    // 步骤 4.4: 排序并保存方案
    selectedCourses.sort((a, b) => {
      if (a.parsed.day !== b.parsed.day) return a.parsed.day - b.parsed.day;
      return a.parsed.startPeriod - b.parsed.startPeriod;
    });
    
    generatedPlans.value.push({
      template: { ...template },
      courses: selectedCourses,
    });
  }
  
  ElMessage.success(`成功生成 ${generatedPlans.value.length} 个选课方案！`);
  activeTab.value = 'results'; // 切换到结果标签页
  activePlanNames.value = generatedPlans.value.map((_, i) => i); // 默认展开所有
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
          allCourses.value = data.courses;
          jsonUpdateTime.value = '本地上传';
          processedCourses.value = preprocessCourses(data.courses);
          
          applyFilters();
          
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
    
    const url = `https://oss.nekoark.com/gxhpy_classes.json?t=${new Date().getTime()}`;
    const response = await axios.get(url);
    
    if (response.data && response.data.courses) {
      allCourses.value = response.data.courses;
      // 从网络获取时，正常显示更新时间
      jsonUpdateTime.value = response.data.update_time || '未知';
      processedCourses.value = preprocessCourses(response.data.courses);
      
      applyFilters(); // 加载完数据后手动筛选

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
/* 简单的样式 */
.app-header {
  background-color: #409EFF;
  color: #fff;
  text-align: center;
  font-size: 20px;
  line-height: 60px;
  height: 60px; /* 显式设置默认高度 */
}
.el-card {
  margin-bottom: 20px;
}
.plan-template {
  border: 1px solid #ebeef5;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  position: relative;
}
.plan-template .el-button[type="danger"] {
  position: absolute;
  top: 10px;
  right: 10px;
}
.el-checkbox-group .el-checkbox {
  width: 80px; /* 调整复选框间距 */
}

/* 课程总览表格的默认高度 */
.main-course-table {
  height: 600px;
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
  background-color: var(--el-fill-color-lighter);
}
.course-table-empty {
  color: var(--el-text-color-secondary);
}

/* 添加媒体查询以实现移动端适配 */
@media (max-width: 767px) {
  .app-header {
    height: 50px;
    line-height: 50px;
    font-size: 18px;
  }
  
  .app-main {
    padding: 10px; /* 减少 main 区域的内边距 */
  }

  .main-course-table {
    height: 450px; /* 移动端表格高度 */
  }

  /* 修复表格在移动端显示不全的问题，允许横向滚动 */
  .plan-result-table .el-table__body-wrapper {
    overflow-x: auto;
  }

  /* 修复 el-tabs 在移动端的内边距 */
  .el-tabs__content {
    padding: 16px 5px;
  }

  /* 方案模板中的星期选择，改为垂直堆叠 */
  .plan-template .el-checkbox-group {
    display: flex;
    flex-direction: column;
  }
  .plan-template .el-checkbox-group .el-checkbox {
    width: auto; /* 取消固定宽度 */
    margin-right: 0;
  }
  
  /* 筛选条件中的校区选择，改为垂直堆叠 */
  .responsive-checkbox-group {
    display: flex;
    flex-direction: column;
  }
  .responsive-checkbox-group .el-checkbox {
     width: auto; /* 取消固定宽度 */
     margin-right: 0;
  }
}
</style>
