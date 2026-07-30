/**
 * CSV 导出模块
 */

import { calcRecordTotal } from './storage.js';

/**
 * 导出指定月份的记录为 CSV
 * @param {number} year
 * @param {number} month - 1-12
 * @param {Object} allRecords - 全部记录
 */
export function exportMonthCSV(year, month, allRecords) {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const records = {};

  for (const [dateStr, record] of Object.entries(allRecords)) {
    if (dateStr.startsWith(prefix)) {
      records[dateStr] = record;
    }
  }

  const filename = `工时记录_${year}年${month}月.csv`;
  downloadCSV(filename, records);
}

/**
 * 导出全部数据为 CSV
 * @param {Object} allRecords - 全部记录
 */
export function exportAllCSV(allRecords) {
  const filename = `工时记录_全部数据.csv`;
  downloadCSV(filename, allRecords);
}

/**
 * 生成并下载 CSV 文件
 */
function downloadCSV(filename, records) {
  const rows = [];
  const dateKeys = Object.keys(records).sort();

  if (dateKeys.length === 0) {
    alert('没有可导出的数据');
    return;
  }

  // CSV 表头
  rows.push([
    '日期',
    '正常工时(小时)',
    '正常时薪(元)',
    '加班工时(小时)',
    '加班时薪(元)',
    '补贴明细',
    '补贴合计(元)',
    '扣款明细',
    '扣款合计(元)',
    '当日总收入(元)',
    '备注'
  ]);

  for (const dateStr of dateKeys) {
    const record = records[dateStr];
    const subsidiesList = (record.subsidies || []).map(s => `${s.label}:${s.amount}`).join('; ');
    const deductionsList = (record.deductions || []).map(d => `${d.label}:${d.amount}`).join('; ');
    const subsidiesTotal = (record.subsidies || []).reduce((sum, s) => sum + (s.amount || 0), 0);
    const deductionsTotal = (record.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
    const total = calcRecordTotal(record);

    rows.push([
      dateStr,
      record.normalHours || 0,
      record.normalRate || 0,
      record.overtimeHours || 0,
      record.overtimeRate || 0,
      subsidiesList,
      subsidiesTotal,
      deductionsList,
      deductionsTotal,
      total,
      record.note || ''
    ]);
  }

  // 构建 CSV 内容（添加 BOM 以正确识别 UTF-8 中文）
  const BOM = '﻿';
  const csvContent = BOM + rows.map(row =>
    row.map(cell => {
      // 包含逗号、换行或引号的值需要包裹在引号中
      const str = String(cell);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');

  // 触发下载
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
