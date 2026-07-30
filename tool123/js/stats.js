/**
 * 月度统计模块
 */

import { calcRecordTotal } from './storage.js';

/**
 * 计算月度统计数据
 * @param {number} year
 * @param {number} month - 1-12
 * @param {Object} records - 当月记录 { "YYYY-MM-DD": {...} }
 * @returns {Object} 统计数据
 */
export function calculateMonthStats(year, month, records) {
  let totalNormalHours = 0;
  let totalOvertimeHours = 0;
  let totalNormalPay = 0;
  let totalOvertimePay = 0;
  let totalSubsidies = 0;
  let totalDeductions = 0;
  let totalIncome = 0;
  let recordDays = 0;

  const prefix = `${year}-${String(month).padStart(2, '0')}-`;

  for (const [dateStr, record] of Object.entries(records)) {
    if (!dateStr.startsWith(prefix)) continue;

    const normalHours = record.normalHours || 0;
    const overtimeHours = record.overtimeHours || 0;
    const normalPay = normalHours * (record.normalRate || 0);
    const overtimePay = overtimeHours * (record.overtimeRate || 0);
    const subsidies = (record.subsidies || []).reduce((sum, s) => sum + (s.amount || 0), 0);
    const deductions = (record.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);

    totalNormalHours += normalHours;
    totalOvertimeHours += overtimeHours;
    totalNormalPay += normalPay;
    totalOvertimePay += overtimePay;
    totalSubsidies += subsidies;
    totalDeductions += deductions;

    if (normalHours > 0 || overtimeHours > 0) {
      recordDays++;
    }
  }

  totalIncome = totalNormalPay + totalOvertimePay + totalSubsidies - totalDeductions;

  return {
    year,
    month,
    recordDays,
    totalNormalHours,
    totalOvertimeHours,
    totalNormalPay,
    totalOvertimePay,
    totalSubsidies,
    totalDeductions,
    totalIncome
  };
}

/**
 * 渲染月度统计页面
 * @param {HTMLElement} container
 * @param {number} year
 * @param {number} month - 1-12
 * @param {Object} records - 当月记录
 * @param {Function} onBack - 返回回调
 * @param {Function} onExportMonth - 导出本月回调
 */
export function renderStats(container, year, month, records, onBack, onExportMonth) {
  const stats = calculateMonthStats(year, month, records);

  let html = '';

  // 月份导航
  html += `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <button class="header-btn" id="btn-stats-back">←</button>
      <div style="font-weight:700;font-size:1.1rem;">${year}年 ${month}月 统计</div>
      <div style="width:36px;"></div>
    </div>
  `;

  // 总收入大卡片
  html += `
    <div class="stats-hero">
      <div class="stats-hero-label">总收入</div>
      <div class="stats-hero-amount">¥ ${stats.totalIncome.toLocaleString('zh-CN')}</div>
    </div>
  `;

  // 统计明细
  html += '<div class="stats-list">';

  html += statsRow('出勤天数', `${stats.recordDays} 天`);
  html += statsRow('正常工时', `${stats.totalNormalHours} 小时`);
  html += statsRow('加班工时', `${stats.totalOvertimeHours} 小时`);
  html += statsRow('正常薪资', `¥ ${stats.totalNormalPay.toLocaleString('zh-CN')}`);
  html += statsRow('加班薪资', `¥ ${stats.totalOvertimePay.toLocaleString('zh-CN')}`);

  if (stats.totalSubsidies > 0) {
    html += statsRow('补贴合计', `+ ¥ ${stats.totalSubsidies.toLocaleString('zh-CN')}`, 'text-success');
  }
  if (stats.totalDeductions > 0) {
    html += statsRow('扣款合计', `- ¥ ${stats.totalDeductions.toLocaleString('zh-CN')}`, 'text-danger');
  }

  html += '<hr class="stats-divider">';
  html += statsRow('合计', `¥ ${stats.totalIncome.toLocaleString('zh-CN')}`, 'text-primary', true);

  html += '</div>';

  // 导出按钮
  html += `
    <div style="margin-top:20px;">
      <button class="btn btn-secondary" id="btn-export-month">
        📥 导出本月 CSV
      </button>
    </div>
  `;

  container.innerHTML = html;

  // 返回按钮
  document.getElementById('btn-stats-back').addEventListener('click', () => {
    if (onBack) onBack();
  });

  // 导出按钮
  document.getElementById('btn-export-month').addEventListener('click', () => {
    if (onExportMonth) onExportMonth(year, month);
  });
}

function statsRow(label, value, valueClass, isTotal) {
  const cls = isTotal ? 'stats-item total-row' : 'stats-item';
  const valCls = valueClass || '';
  return `
    <div class="${cls}">
      <span class="stats-item-label">${label}</span>
      <span class="stats-item-value ${valCls}">${value}</span>
    </div>
  `;
}
