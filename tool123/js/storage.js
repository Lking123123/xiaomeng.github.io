/**
 * 数据存储层 - localStorage 读写封装
 */

const STORAGE_KEYS = {
  SETTINGS: 'worktracker_settings',
  RECORDS: 'worktracker_records'
};

// 默认设置
const DEFAULT_SETTINGS = {
  wageStandards: [
    { id: 'default', name: '标准', normalRate: 35, overtimeRate: 50 }
  ],
  activeWageStandardId: 'default'
};

/**
 * 生成唯一 ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * 获取应用设置
 */
export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS, wageStandards: DEFAULT_SETTINGS.wageStandards.map(w => ({...w})) };
    const settings = JSON.parse(raw);
    // 确保数据结构完整
    if (!settings.wageStandards || settings.wageStandards.length === 0) {
      settings.wageStandards = DEFAULT_SETTINGS.wageStandards.map(w => ({...w}));
    }
    if (!settings.activeWageStandardId) {
      settings.activeWageStandardId = settings.wageStandards[0].id;
    }
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS, wageStandards: DEFAULT_SETTINGS.wageStandards.map(w => ({...w})) };
  }
}

/**
 * 保存应用设置
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('保存设置失败:', e);
    return false;
  }
}

/**
 * 获取当前激活的工资标准
 */
export function getActiveWageStandard() {
  const settings = getSettings();
  const active = settings.wageStandards.find(w => w.id === settings.activeWageStandardId);
  return active || settings.wageStandards[0] || DEFAULT_SETTINGS.wageStandards[0];
}

/**
 * 获取所有工时记录
 * @returns {Object} { "YYYY-MM-DD": { ... } }
 */
export function getAllRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * 获取某个月份的记录
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {Object} 过滤后的记录
 */
export function getMonthRecords(year, month) {
  const allRecords = getAllRecords();
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const result = {};
  for (const [dateStr, record] of Object.entries(allRecords)) {
    if (dateStr.startsWith(prefix)) {
      result[dateStr] = record;
    }
  }
  return result;
}

/**
 * 获取某一天的记录
 * @param {string} dateStr - "YYYY-MM-DD"
 */
export function getRecord(dateStr) {
  const allRecords = getAllRecords();
  return allRecords[dateStr] || null;
}

/**
 * 保存某一天的记录
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {Object} record
 */
export function saveRecord(dateStr, record) {
  try {
    const allRecords = getAllRecords();
    allRecords[dateStr] = record;
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(allRecords));
    return true;
  } catch (e) {
    console.error('保存记录失败:', e);
    return false;
  }
}

/**
 * 删除某一天的记录
 * @param {string} dateStr - "YYYY-MM-DD"
 */
export function deleteRecord(dateStr) {
  try {
    const allRecords = getAllRecords();
    delete allRecords[dateStr];
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(allRecords));
    return true;
  } catch (e) {
    console.error('删除记录失败:', e);
    return false;
  }
}

/**
 * 计算单条记录的总收入
 */
export function calcRecordTotal(record) {
  if (!record) return 0;
  const normalPay = (record.normalHours || 0) * (record.normalRate || 0);
  const overtimePay = (record.overtimeHours || 0) * (record.overtimeRate || 0);
  const subsidiesTotal = (record.subsidies || []).reduce((sum, s) => sum + (s.amount || 0), 0);
  const deductionsTotal = (record.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
  return normalPay + overtimePay + subsidiesTotal - deductionsTotal;
}

/**
 * 清除所有数据
 */
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    return true;
  } catch {
    return false;
  }
}

/**
 * 导出所有数据为 JSON（用于备份）
 */
export function exportAllDataJSON() {
  return {
    settings: getSettings(),
    records: getAllRecords()
  };
}

/**
 * 计算某日期的总工时（正常+加班）
 */
export function calcTotalHours(record) {
  if (!record) return 0;
  return (record.normalHours || 0) + (record.overtimeHours || 0);
}
