<template>
  <el-card class="panel-card course-overview-card">
    <template #header>
      <div class="course-toolbar">
        <div class="course-toolbar-title">
          <strong>课程总览</strong>
          <span class="course-count">{{ filteredCourses.length }} / {{ courses.length }}</span>
          <small v-if="updateTime">更新于 {{ updateTime }}</small>
        </div>

        <div class="course-toolbar-actions">
          <el-link
            type="warning"
            href="./get_classes.zip"
            :icon="Download"
            target="_blank"
            rel="noopener noreferrer"
          >
            下载脚本
          </el-link>

          <input
            ref="fileInput"
            type="file"
            accept=".json,application/json"
            class="visually-hidden-file-input"
            tabindex="-1"
            aria-hidden="true"
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

          <el-tooltip content="刷新课程数据" placement="top">
            <el-button
              type="primary"
              :icon="Refresh"
              circle
              :loading="loading"
              aria-label="刷新课程数据"
              @click="$emit('refresh')"
            />
          </el-tooltip>
        </div>
      </div>
    </template>

    <el-alert
      v-if="loadError"
      class="course-load-alert"
      :title="courses.length > 0 ? '课程数据更新失败' : '课程数据加载失败'"
      :description="errorDescription"
      type="error"
      show-icon
      :closable="false"
    />

    <el-alert
      v-if="rejectedCount > 0"
      class="course-load-alert"
      :title="`当前数据已忽略 ${rejectedCount} 条无效课程记录`"
      description="这些记录的上课时间或人数等字段无法识别，未参与筛选和方案生成。"
      type="warning"
      show-icon
      :closable="false"
    />

    <div class="main-course-table" v-loading="loading" element-loading-text="正在加载课程数据..." :aria-busy="loading">
      <el-auto-resizer>
        <template #default="{ height, width }">
          <el-table-v2
            :columns="getCourseTableColumns(width)"
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
            aria-label="课程总览"
            :aria-rowcount="sortedFilteredCourses.length + 1"
            @column-sort="handleCourseSort"
          >
            <template #empty>
              <el-empty :image-size="96" class="course-table-empty">
                <template #description>
                  <p class="course-table-empty-title">
                    {{ courses.length === 0
                      ? '暂未获取到课程列表'
                      : '没有符合筛选条件的课程' }}
                  </p>
                  <p class="course-table-empty-hint">
                    {{ courses.length === 0
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
    <el-dialog v-model="detailsVisible" title="课程详情" class="course-detail-dialog" width="min(560px, calc(100vw - 32px))" destroy-on-close>
      <dl v-if="selectedCourse" class="course-full-details">
        <div><dt>课程名称</dt><dd>{{ selectedCourse.kcmc || '暂无' }}</dd></div>
        <div><dt>教师信息</dt><dd>{{ selectedCourse.jsxx || '暂无' }}</dd></div>
        <div><dt>上课时间</dt><dd>{{ selectedCourse.sksj || '暂无' }}</dd></div>
        <div><dt>上课地点</dt><dd>{{ selectedCourse.jxdd || '暂无' }}</dd></div>
        <div><dt>已选/容量</dt><dd>{{ selectedCourse.display.selectedCapacity }}</dd></div>
        <div><dt>报录比</dt><dd>{{ selectedCourse.display.ratio }}</dd></div>
      </dl>
      <template #footer><el-button @click="detailsVisible = false">关闭</el-button></template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, h, ref, shallowRef, watch } from 'vue';
import { ElIcon, TableV2SortOrder } from 'element-plus';
import 'element-plus/es/components/icon/style/css';
import { Download, Hide, Refresh, Upload, View } from '@element-plus/icons-vue';

const props = defineProps({
  courses: {
    type: Array,
    default: () => [],
  },
  filteredCourses: {
    type: Array,
    default: () => [],
  },
  updateTime: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  rejectedCount: {
    type: Number,
    default: 0,
  },
  loadError: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['file-selected', 'refresh']);

const fileInput = ref(null);
const selectedCourse = shallowRef(null);
const detailsVisible = ref(false);
const openCourseDetails = (course) => {
  selectedCourse.value = course;
  detailsVisible.value = true;
};
watch(() => props.courses, () => {
  detailsVisible.value = false;
  selectedCourse.value = null;
});
const showFullTeacherInfo = ref(false);
const courseSort = ref({
  key: 'ratio',
  order: TableV2SortOrder.DESC,
});

const toggleTeacherInfo = () => {
  showFullTeacherInfo.value = !showFullTeacherInfo.value;
};

const handleTeacherToggleKeydown = (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  event.stopPropagation();
  toggleTeacherInfo();
};

const errorDescription = computed(() => (
  props.courses.length > 0
    ? `${props.loadError}。当前继续显示上一次成功加载的课程数据。`
    : `${props.loadError}。请重试，或上传本地 JSON 文件。`
));

const renderTextCell = (text, title = text) => h(
  'span',
  {
    class: 'course-table-cell-text',
    title: title == null ? '' : String(title),
  },
  text == null ? '' : String(text),
);

const courseTableColumns = computed(() => {
  const showFullTeacher = showFullTeacherInfo.value;

  return [
  {
    key: 'kcmc',
    dataKey: 'kcmc',
    title: '课程名称',
    width: 80,
    cellRenderer: ({ rowData }) => h('button', {
      type: 'button', class: 'course-table-cell-text course-detail-link',
      title: rowData.kcmc, 'aria-label': `查看课程详情：${rowData.kcmc || '未命名课程'}`,
      onClick: () => openCourseDetails(rowData),
    }, rowData.kcmc || '未命名课程'),
  },
  {
    key: 'jsxx',
    dataKey: 'jsxx',
    title: '教师',
    width: 88,
    headerCellRenderer: () => h(
      'div',
      { class: 'teacher-column-header' },
      [
        h('span', '教师'),
        h(
          'button',
          {
            type: 'button',
            class: 'teacher-info-toggle',
            title: showFullTeacher ? '隐藏完整教师信息' : '显示完整教师信息',
            'aria-label': showFullTeacher ? '隐藏完整教师信息' : '显示完整教师信息',
            onClick: toggleTeacherInfo,
            onKeydown: handleTeacherToggleKeydown,
          },
          [h(ElIcon, null, { default: () => h(showFullTeacher ? View : Hide) })],
        ),
      ],
    ),
    cellRenderer: ({ rowData }) => renderTextCell(
      showFullTeacher ? rowData.jsxx : rowData.display.teacherName,
      rowData.jsxx,
    ),
  },
  {
    key: 'sksj',
    dataKey: 'sksj',
    title: '上课时间',
    width: 180,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.sksj),
  },
  {
    key: 'jxdd',
    dataKey: 'jxdd',
    title: '上课地点',
    width: 88,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.jxdd),
  },
  {
    key: 'yxrs',
    dataKey: 'yxrs',
    title: '已选/容量',
    width: 86,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.display.selectedCapacity),
  },
  {
    key: 'ratio',
    dataKey: 'ratio',
    title: '报录比',
    width: 100,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.display.ratio),
  },
  {
    key: 'week',
    dataKey: 'week',
    title: '周',
    width: 48,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.parsed.week),
  },
  {
    key: 'day',
    dataKey: 'day',
    title: '天',
    width: 48,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.display.day),
  },
  {
    key: 'startPeriod',
    dataKey: 'startPeriod',
    title: '节',
    width: 55,
    sortable: true,
    cellRenderer: ({ rowData }) => renderTextCell(rowData.display.period),
  },
  ];
});

const getCourseTableColumns = (tableWidth) => {
  const columns = courseTableColumns.value;
  const fixedColumnsWidth = columns
    .slice(1)
    .reduce((total, column) => total + column.width, 0);
  const courseNameWidth = Math.max(
    columns[0].width,
    Math.floor(tableWidth - fixedColumnsWidth),
  );

  return [
    { ...columns[0], width: courseNameWidth },
    ...columns.slice(1),
  ];
};

const courseSortValueGetters = {
  yxrs: course => course.yxrs,
  ratio: course => course.parsed.ratio,
  week: course => course.parsed.week,
  day: course => course.parsed.day,
  startPeriod: course => course.parsed.startPeriod,
};

const sortedFilteredCourses = computed(() => {
  const valueGetter = courseSortValueGetters[courseSort.value.key];
  if (!valueGetter) return props.filteredCourses;

  const direction = courseSort.value.order === TableV2SortOrder.ASC ? 1 : -1;
  return [...props.filteredCourses].sort((courseA, courseB) => (
    (valueGetter(courseA) - valueGetter(courseB)) * direction
  ));
});

const handleCourseSort = ({ key, order }) => {
  courseSort.value = { key, order };
};

const courseTableRowClass = ({ rowIndex }) => (
  rowIndex % 2 === 1 ? 'course-table-row--striped' : ''
);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelected = (event) => {
  emit('file-selected', event);
};
</script>

<style>
.course-detail-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.course-detail-link:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}
.course-full-details { margin: 0; }
.course-full-details > div { margin-bottom: 16px; }
.course-full-details dt { color: #64748b; margin-bottom: 4px; }
.course-full-details dd { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }

.course-overview-card > .el-card__body {
  padding: 0 20px 20px;
}

.course-overview-card {
  width: 100%;
  min-width: 0;
}

.course-toolbar {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.course-toolbar-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.course-toolbar-title strong {
  color: #0f172a;
  font-size: 16px;
}

.course-toolbar-title small {
  overflow: hidden;
  color: #64748b;
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

.visually-hidden-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.course-load-alert {
  margin: 0 20px 16px;
}

.main-course-table {
  width: 100%;
  height: 580px;
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
  display: inline-flex;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  align-items: center;
  justify-content: center;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.teacher-info-toggle:hover,
.teacher-info-toggle:focus-visible {
  color: var(--el-color-primary);
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 1px;
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

  .course-load-alert {
    margin: 0 12px 12px;
  }

  .main-course-table {
    height: 430px;
  }
}
</style>
