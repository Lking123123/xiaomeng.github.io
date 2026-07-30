/**
 * 日历视图模块
 */

import { calcRecordTotal, calcTotalHours } from './storage.js';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 获取某月的天数
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 获取某月第一天是星期几 (0=周日, 6=周六)
 */
function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 格式化金额显示（超过1万显示为"万"）
 */
function formatAmount(amount) {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1) + '万';
  }
  return String(amount);
}

/**
 * 渲染日历
 * @param {HTMLElement} container - 日历容器
 * @param {number} year
 * @param {number} month - 1-12
 * @param {Object} records - 当月记录
 * @param {Function} onDateClick - 日期点击回调 (dateStr)
 */
export function renderCalendar(container, year, month, records, onDateClick) {
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1 === 0 ? 12 : month - 1);

  let html = '';

  // 星期标题
  html += '<div class="calendar-weekdays">';
  WEEKDAY_LABELS.forEach((label, i) => {
    html += `<span>${label}</span>`;
  });
  html += '</div>';

  // 日期格子
  html += '<div class="calendar-grid">';

  // 填充上月末尾的日期
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="calendar-cell other-month"><span class="cell-day">${day}</span></div>`;
  }

  // 当月日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    const isToday = dateStr === todayStr;
    const record = records[dateStr];

    let cellClass = 'calendar-cell';
    if (isToday) cellClass += ' today';

    html += `<div class="${cellClass}" data-date="${dateStr}">`;
    html += `<span class="cell-day">${day}</span>`;

    if (record) {
      const totalHours = calcTotalHours(record);
      const totalIncome = calcRecordTotal(record);

      if (totalHours > 0) {
        html += `<span class="cell-dot"></span>`;
      }
      if (totalIncome > 0) {
        html += `<span class="cell-amount">${formatAmount(totalIncome)}</span>`;
      } else if (totalHours > 0) {
        html += `<span class="cell-amount">${totalHours}h</span>`;
      }
    }

    html += '</div>';
  }

  // 填充下月开头的日期（补满一行）
  const totalCells = firstDay + daysInMonth;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let day = 1; day <= remainingCells; day++) {
    html += `<div class="calendar-cell other-month"><span class="cell-day">${day}</span></div>`;
  }

  html += '</div>';

  container.innerHTML = html;

  // 绑定点击事件
  container.querySelectorAll('.calendar-cell:not(.other-month)').forEach(cell => {
    cell.addEventListener('click', () => {
      const dateStr = cell.dataset.date;
      if (dateStr && onDateClick) {
        onDateClick(dateStr);
      }
    });
  });
}

/**
 * 获取月份标签文本（中文）
 */
export function getMonthLabel(year, month) {
  return `${year}年 ${month}月`;
}

export { formatDate, WEEKDAY_LABELS };
