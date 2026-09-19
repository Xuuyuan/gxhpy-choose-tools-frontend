/**
 * 移动端课程总览的固定行高虚拟滚动计算。
 *
 * 移动端课程列表是一个自带滚动的定高容器。课程数量可能达到数百条，若全部渲染，
 * 页面会产生数万像素高的内容并让触摸滚动明显卡顿，因此只渲染可视区间内的卡片。
 *
 * 每张卡片高度固定为 MOBILE_COURSE_CARD_HEIGHT，卡片之间用 margin-bottom 形成
 * MOBILE_COURSE_CARD_GAP 的间距，于是每行占用 pitch = 高度 + 间距。上下占位块
 * 的高度即为「跳过的行数 × pitch」，这样滚动条长度与真实内容长度一致。
 */

export const MOBILE_COURSE_CARD_HEIGHT = 144;
export const MOBILE_COURSE_CARD_GAP = 10;
export const MOBILE_COURSE_LIST_OVERSCAN = 4;

export const MOBILE_COURSE_ROW_PITCH = MOBILE_COURSE_CARD_HEIGHT + MOBILE_COURSE_CARD_GAP;

/**
 * 计算需要渲染的课程下标区间及上下占位高度。
 *
 * @param {object} options
 * @param {number} options.scrollTop 列表容器当前的滚动位置。
 * @param {number} options.viewportHeight 列表容器的可视高度，未测量到时为 0。
 * @param {number} options.itemCount 课程总数。
 * @param {number} [options.itemHeight] 单张卡片高度。
 * @param {number} [options.gap] 卡片之间的间距。
 * @param {number} [options.overscan] 可视区间上下额外渲染的行数，用于减少快速滚动时的白屏。
 * @returns {{ startIndex: number, endIndex: number, topSpacerHeight: number, bottomSpacerHeight: number }}
 *   endIndex 为开区间上界，可直接用于 Array.prototype.slice。
 */
export const computeVirtualWindow = ({
  scrollTop = 0,
  viewportHeight = 0,
  itemCount = 0,
  itemHeight = MOBILE_COURSE_CARD_HEIGHT,
  gap = MOBILE_COURSE_CARD_GAP,
  overscan = MOBILE_COURSE_LIST_OVERSCAN,
} = {}) => {
  const count = Math.max(0, Math.floor(itemCount));
  if (count === 0) {
    return { startIndex: 0, endIndex: 0, topSpacerHeight: 0, bottomSpacerHeight: 0 };
  }

  const pitch = Math.max(1, itemHeight + gap);
  const safeViewport = Math.max(0, viewportHeight);
  const maxScroll = Math.max(0, count * pitch - safeViewport);
  // 筛选或排序变化后内容会变短，浏览器夹取 scrollTop 时不一定派发滚动事件，
  // 因此这里也按内容长度夹取一次，避免渲染区间越界。
  const offset = Math.min(Math.max(0, scrollTop), maxScroll);

  const firstVisibleIndex = Math.floor(offset / pitch);
  const offsetIntoFirstRow = offset - firstVisibleIndex * pitch;
  const visibleCount = Math.ceil((offsetIntoFirstRow + safeViewport) / pitch);

  const startIndex = Math.max(0, firstVisibleIndex - overscan);
  const endIndex = Math.min(count, firstVisibleIndex + Math.max(1, visibleCount) + overscan);

  return {
    startIndex,
    endIndex,
    topSpacerHeight: startIndex * pitch,
    bottomSpacerHeight: (count - endIndex) * pitch,
  };
};
