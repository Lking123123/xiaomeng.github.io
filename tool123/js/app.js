/**
 * 记工时账单 - 应用主逻辑
 */

import { getSettings, saveSettings, getAllRecords, getRecord, saveRecord, deleteRecord, getActiveWageStandard, calcRecordTotal, calcTotalHours, clearAllData } from './storage.js';
import { renderCalendar, getMonthLabel } from './calendar.js';
import { renderRecordForm, showToast } from './record.js';
import { renderStats } from './stats.js';
import { exportMonthCSV, exportAllCSV } from './export.js';
import { renderSettings } from './settings.js';

// 应用状态
const state = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1, // 1-12
  selectedDate: null,
  settings: null,
  records: null
};

// DOM 元素
const pages = {};
let monthLabel, prevMonthBtn, nextMonthBtn, calendarContainer;
let summaryIncome, summaryDetails;
let todayCard;

/**
 * 初始化应用
 */
function init() {
  // 缓存 DOM 引用
  pages.calendar = document.getElementById('page-calendar');
  pages.record = document.getElementById('page-record');
  pages.stats = document.getElementById('page-stats');
  pages.settings = document.getElementById('page-settings');

  monthLabel = document.getElementById('month-label');
  prevMonthBtn = document.getElementById('btn-prev-month');
  nextMonthBtn = document.getElementById('btn-next-month');
  calendarContainer = document.getElementById('calendar-container');
  summaryIncome = document.getElementById('summary-income');
  summaryDetails = document.getElementById('summary-details');
  todayCard = document.getElementById('today-card');

  // 加载数据
  state.settings = getSettings();
  state.records = getAllRecords();

  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service Worker 注册失败:', err);
    });
  }

  // 绑定事件
  bindEvents();

  // 渲染初始页面
  refreshCalendarPage();
  showPage('calendar');
}

/**
 * 绑定全局事件
 */
function bindEvents() {
  // 月份导航
  prevMonthBtn.addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 1) {
      state.currentMonth = 12;
      state.currentYear--;
    }
    refreshCalendarPage();
  });

  nextMonthBtn.addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 12) {
      state.currentMonth = 1;
      state.currentYear++;
    }
    refreshCalendarPage();
  });

  // 点击月份标签 -> 回到今天
  monthLabel.addEventListener('click', () => {
    const today = new Date();
    state.currentYear = today.getFullYear();
    state.currentMonth = today.getMonth() + 1;
    refreshCalendarPage();
  });

  // 今日卡片点击 -> 进入今天的记录
  todayCard.addEventListener('click', () => {
    const today = new Date();
    const dateStr = formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
    openRecordPage(dateStr);
  });

  // 设置按钮
  document.getElementById('btn-open-settings').addEventListener('click', () => {
    openSettingsPage();
  });

  // 月度统计按钮
  document.getElementById('btn-open-stats').addEventListener('click', () => {
    openStatsPage();
  });
}

/**
 * 显示指定页面
 */
function showPage(pageName) {
  Object.values(pages).forEach(p => p.classList.remove('active'));
  if (pages[pageName]) {
    pages[pageName].classList.add('active');
  }
}

/**
 * 刷新日历页
 */
function refreshCalendarPage() {
  // 更新标题
  monthLabel.textContent = getMonthLabel(state.currentYear, state.currentMonth);

  // 刷新数据
  state.records = getAllRecords();

  // 获取当月记录
  const prefix = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}-`;
  const monthRecords = {};
  for (const [dateStr, record] of Object.entries(state.records)) {
    if (dateStr.startsWith(prefix)) {
      monthRecords[dateStr] = record;
    }
  }

  // 渲染日历
  renderCalendar(calendarContainer, state.currentYear, state.currentMonth, monthRecords, (dateStr) => {
    openRecordPage(dateStr);
  });

  // 更新月度汇总
  updateMonthSummary(monthRecords);

  // 更新今日卡片
  updateTodayCard();
}

/**
 * 更新月度汇总卡片
 */
function updateMonthSummary(monthRecords) {
  let totalIncome = 0;
  let totalNormalHours = 0;
  let totalOvertimeHours = 0;

  for (const record of Object.values(monthRecords)) {
    totalNormalHours += record.normalHours || 0;
    totalOvertimeHours += record.overtimeHours || 0;
    totalIncome += calcRecordTotal(record);
  }

  summaryIncome.textContent = `¥ ${totalIncome.toLocaleString('zh-CN')}`;

  let detailsHtml = '';
  if (totalNormalHours > 0) {
    detailsHtml += `<span>📋 ${totalNormalHours}h</span>`;
  }
  if (totalOvertimeHours > 0) {
    detailsHtml += `<span>🔥 ${totalOvertimeHours}h</span>`;
  }
  if (!detailsHtml) {
    detailsHtml = '<span>本月暂无记录</span>';
  }
  summaryDetails.innerHTML = detailsHtml;
}

/**
 * 更新今日卡片
 */
function updateTodayCard() {
  const today = new Date();
  const dateStr = formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const record = state.records[dateStr];

  const todayLabel = todayCard.querySelector('.today-label');
  const todayDate = todayCard.querySelector('.today-date');
  const todaySummary = todayCard.querySelector('.today-summary');

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  todayLabel.textContent = '今日';
  todayDate.textContent = `${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;

  if (record && (record.normalHours > 0 || record.overtimeHours > 0)) {
    todayCard.classList.add('has-record');
    const totalHours = calcTotalHours(record);
    const totalIncome = calcRecordTotal(record);
    todaySummary.innerHTML = `
      <div class="today-hours">${totalHours}小时</div>
      <div class="today-income">¥ ${totalIncome}</div>
    `;
  } else {
    todayCard.classList.remove('has-record');
    todaySummary.innerHTML = '<div class="today-empty">点击记录今天 →</div>';
  }
}

/**
 * 打开记录编辑页
 */
function openRecordPage(dateStr) {
  state.selectedDate = dateStr;
  const record = state.records[dateStr] || null;
  const wageStandard = getActiveWageStandard();

  const container = pages.record;
  container.innerHTML = '';

  renderRecordForm(
    container,
    dateStr,
    record,
    wageStandard,
    // onSave
    (formData) => {
      saveRecord(dateStr, formData);
      state.records = getAllRecords();
      showToast('保存成功 ✓');
      refreshCalendarPage();
      showPage('calendar');
    },
    // onDelete
    () => {
      deleteRecord(dateStr);
      state.records = getAllRecords();
      showToast('已删除记录');
      refreshCalendarPage();
      showPage('calendar');
    },
    // onBack
    () => {
      refreshCalendarPage();
      showPage('calendar');
    }
  );

  showPage('record');
}

/**
 * 打开月度统计页
 */
function openStatsPage() {
  const container = pages.stats;
  container.innerHTML = '';

  const prefix = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}-`;
  const monthRecords = {};
  for (const [dateStr, record] of Object.entries(state.records)) {
    if (dateStr.startsWith(prefix)) {
      monthRecords[dateStr] = record;
    }
  }

  renderStats(
    container,
    state.currentYear,
    state.currentMonth,
    monthRecords,
    // onBack
    () => {
      showPage('calendar');
    },
    // onExportMonth
    (year, month) => {
      exportMonthCSV(year, month, state.records);
      showToast('导出成功 ✓');
    }
  );

  showPage('stats');
}

/**
 * 打开设置页
 */
function openSettingsPage() {
  const container = pages.settings;
  container.innerHTML = '';

  renderSettings(
    container,
    state.settings,
    // onSave
    (newSettings) => {
      state.settings = newSettings;
      saveSettings(newSettings);
      // 重新渲染设置页
      openSettingsPage();
    },
    // onBack
    () => {
      state.settings = getSettings();
      refreshCalendarPage();
      showPage('calendar');
    },
    // onExportAll
    () => {
      exportAllCSV(state.records);
      showToast('导出成功 ✓');
    },
    // onClearAll
    () => {
      clearAllData();
      state.records = {};
      state.settings = getSettings();
      showToast('数据已清除');
      refreshCalendarPage();
      showPage('calendar');
    }
  );

  showPage('settings');
}

/**
 * 格式化日期
 */
function formatDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
