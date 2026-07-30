/**
 * 工时记录编辑模块
 */

import { calcRecordTotal, generateId } from './storage.js';

/**
 * 渲染记录编辑表单
 * @param {HTMLElement} container - 表单容器
 * @param {string} dateStr - 日期 "YYYY-MM-DD"
 * @param {Object|null} record - 已有记录或 null
 * @param {Object} wageStandard - 当前激活的工资标准 { normalRate, overtimeRate }
 * @param {Function} onSave - 保存回调 (record)
 * @param {Function} onDelete - 删除回调
 * @param {Function} onBack - 返回回调
 */
export function renderRecordForm(container, dateStr, record, wageStandard, onSave, onDelete, onBack) {
  // 如果没有记录，创建默认值
  const data = record || {
    normalHours: '',
    normalRate: wageStandard?.normalRate || 35,
    overtimeHours: '',
    overtimeRate: wageStandard?.overtimeRate || 50,
    subsidies: [],
    deductions: [],
    note: ''
  };

  // 格式化日期显示
  const [y, m, d] = dateStr.split('-');
  const dateDisplay = `${parseInt(m)}月${parseInt(d)}日`;
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[new Date(y, m - 1, d).getDay()];

  let html = '';

  // 页面头部
  html += `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <button class="header-btn" id="btn-record-back">←</button>
      <div style="text-align:center;">
        <div style="font-weight:700;font-size:1.1rem;">${dateDisplay}</div>
        <div style="font-size:0.8rem;color:var(--color-text-secondary);">${weekday}</div>
      </div>
      <div style="width:36px;"></div>
    </div>
  `;

  // 正常工时区块
  html += `
    <div class="form-group">
      <label class="form-label">正常工时</label>
      <div class="form-row">
        <input type="number" class="form-input" id="input-normal-hours"
               value="${data.normalHours}" placeholder="0" min="0" max="24" step="1" inputmode="numeric">
        <span class="form-input-suffix">小时</span>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">时薪</label>
      <div class="form-row">
        <input type="number" class="form-input" id="input-normal-rate"
               value="${data.normalRate}" placeholder="0" min="0" step="1" inputmode="numeric">
        <span class="form-input-suffix">元/小时</span>
      </div>
    </div>
  `;

  html += '<hr class="form-divider">';

  // 加班工时区块
  html += `
    <div class="form-group">
      <label class="form-label">加班工时</label>
      <div class="form-row">
        <input type="number" class="form-input" id="input-overtime-hours"
               value="${data.overtimeHours}" placeholder="0" min="0" max="24" step="1" inputmode="numeric">
        <span class="form-input-suffix">小时</span>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">加班时薪</label>
      <div class="form-row">
        <input type="number" class="form-input" id="input-overtime-rate"
               value="${data.overtimeRate}" placeholder="0" min="0" step="1" inputmode="numeric">
        <span class="form-input-suffix">元/小时</span>
      </div>
    </div>
  `;

  html += '<hr class="form-divider">';

  // 补贴区块
  html += `
    <div class="form-group">
      <label class="form-label">补贴</label>
      <div class="extra-items" id="subsidies-list"></div>
      <button class="btn-add-extra" id="btn-add-subsidy">+ 添加补贴</button>
    </div>
  `;

  html += '<hr class="form-divider">';

  // 扣款区块
  html += `
    <div class="form-group">
      <label class="form-label">扣款</label>
      <div class="extra-items" id="deductions-list"></div>
      <button class="btn-add-extra" id="btn-add-deduction">+ 添加扣款</button>
    </div>
  `;

  html += '<hr class="form-divider">';

  // 备注
  html += `
    <div class="form-group note-input">
      <label class="form-label">备注（可选）</label>
      <input type="text" class="form-input" id="input-note"
             value="${data.note || ''}" placeholder="如：项目名称、工作内容...">
    </div>
  `;

  // 总计
  const currentTotal = calcRecordTotal(data);
  const hasAnyData = data.normalHours || data.overtimeHours || data.subsidies.length > 0 || data.deductions.length > 0;
  html += `
    <div class="total-display">
      <div class="total-label">今日总计</div>
      <div class="total-amount" id="total-amount">¥ ${currentTotal}</div>
    </div>
  `;

  // 按钮
  html += '<div class="btn-group">';
  html += '<button class="btn btn-primary" id="btn-save">保存</button>';
  if (record) {
    html += '<button class="btn btn-danger" id="btn-delete">删除记录</button>';
  }
  html += '</div>';

  container.innerHTML = html;

  // 渲染补贴列表
  renderExtraItems('subsidies-list', data.subsidies || [], 'positive', () => updateTotal());
  // 渲染扣款列表
  renderExtraItems('deductions-list', data.deductions || [], 'negative', () => updateTotal());

  // 更新总计的函数
  function updateTotal() {
    const record = getFormData();
    const total = calcRecordTotal(record);
    const totalEl = document.getElementById('total-amount');
    if (totalEl) {
      totalEl.textContent = `¥ ${total}`;
    }
  }

  // 监听输入变化实时更新总计
  container.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', updateTotal);
  });

  // 返回按钮
  document.getElementById('btn-record-back').addEventListener('click', () => {
    if (onBack) onBack();
  });

  // 添加补贴
  document.getElementById('btn-add-subsidy').addEventListener('click', () => {
    showExtraModal('添加补贴', 'positive', (item) => {
      data.subsidies.push(item);
      renderExtraItems('subsidies-list', data.subsidies, 'positive', () => updateTotal());
      updateTotal();
    });
  });

  // 添加扣款
  document.getElementById('btn-add-deduction').addEventListener('click', () => {
    showExtraModal('添加扣款', 'negative', (item) => {
      data.deductions.push(item);
      renderExtraItems('deductions-list', data.deductions, 'negative', () => updateTotal());
      updateTotal();
    });
  });

  // 保存按钮
  document.getElementById('btn-save').addEventListener('click', () => {
    const formData = getFormData();
    if (onSave) onSave(formData);
  });

  // 删除按钮
  if (record) {
    document.getElementById('btn-delete').addEventListener('click', () => {
      showConfirmDialog('确定要删除这条记录吗？此操作不可恢复。', () => {
        if (onDelete) onDelete();
      });
    });
  }
}

/**
 * 渲染额外条目列表（补贴/扣款）
 */
function renderExtraItems(containerId, items, type, onDelete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '<div style="font-size:0.85rem;color:var(--color-text-muted);padding:8px 0;">暂无</div>';
    return;
  }

  container.innerHTML = items.map((item, index) => `
    <div class="extra-item">
      <span class="extra-label">${escapeHtml(item.label)}</span>
      <span class="extra-amount ${type === 'positive' ? 'positive' : 'negative'}">
        ${type === 'positive' ? '+' : '-'}${item.amount}元
      </span>
      <button class="extra-delete" data-index="${index}">✕</button>
    </div>
  `).join('');

  // 绑定删除按钮
  container.querySelectorAll('.extra-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      items.splice(idx, 1);
      renderExtraItems(containerId, items, type, onDelete);
      if (onDelete) onDelete();
    });
  });
}

/**
 * 显示添加补贴/扣款的底部弹窗
 */
function showExtraModal(title, type, onConfirm) {
  // 移除已有弹窗
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title">${title}</div>
      <div class="form-group">
        <label class="form-label">项目名称</label>
        <input type="text" class="form-input" id="extra-label-input" placeholder="如：餐补、交通补贴...">
      </div>
      <div class="form-group">
        <label class="form-label">金额（元）</label>
        <input type="number" class="form-input" id="extra-amount-input" placeholder="0" min="0" step="1" inputmode="numeric">
      </div>
      <button class="btn btn-primary" id="extra-confirm-btn">确定</button>
      <button class="btn btn-secondary" id="extra-cancel-btn" style="margin-top:8px;">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.getElementById('extra-cancel-btn').addEventListener('click', closeModal);

  document.getElementById('extra-confirm-btn').addEventListener('click', () => {
    const label = document.getElementById('extra-label-input').value.trim();
    const amount = parseInt(document.getElementById('extra-amount-input').value) || 0;

    if (!label) {
      showToast('请输入项目名称');
      return;
    }
    if (amount <= 0) {
      showToast('金额必须大于0');
      return;
    }

    closeModal();
    onConfirm({ id: generateId(), label, amount });
  });
}

/**
 * 显示确认对话框
 */
function showConfirmDialog(message, onConfirm) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="confirm-dialog">
        <div class="confirm-text">${message}</div>
        <button class="btn btn-danger" id="confirm-yes-btn">确定删除</button>
        <button class="btn btn-secondary" id="confirm-no-btn" style="margin-top:8px;">取消</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();

  document.getElementById('confirm-no-btn').addEventListener('click', closeModal);
  document.getElementById('confirm-yes-btn').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

/**
 * 从表单获取数据
 */
export function getFormData() {
  const normalHours = parseInt(document.getElementById('input-normal-hours')?.value) || 0;
  const normalRate = parseInt(document.getElementById('input-normal-rate')?.value) || 0;
  const overtimeHours = parseInt(document.getElementById('input-overtime-hours')?.value) || 0;
  const overtimeRate = parseInt(document.getElementById('input-overtime-rate')?.value) || 0;
  const note = document.getElementById('input-note')?.value?.trim() || '';

  // 从DOM中读取补贴和扣款
  const subsidies = [];
  const deductions = [];

  document.querySelectorAll('#subsidies-list .extra-item').forEach(item => {
    const label = item.querySelector('.extra-label')?.textContent || '';
    const amountText = item.querySelector('.extra-amount')?.textContent || '0';
    const amount = parseInt(amountText.replace(/[^0-9]/g, '')) || 0;
    subsidies.push({ id: generateId(), label, amount });
  });

  document.querySelectorAll('#deductions-list .extra-item').forEach(item => {
    const label = item.querySelector('.extra-label')?.textContent || '';
    const amountText = item.querySelector('.extra-amount')?.textContent || '0';
    const amount = parseInt(amountText.replace(/[^0-9]/g, '')) || 0;
    deductions.push({ id: generateId(), label, amount });
  });

  return { normalHours, normalRate, overtimeHours, overtimeRate, subsidies, deductions, note };
}

/**
 * HTML 转义
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 显示 Toast 提示
 */
function showToast(message) {
  // 移除已有 toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

export { showToast };
