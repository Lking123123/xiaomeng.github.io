/**
 * 设置页面模块
 */

import { generateId } from './storage.js';

/**
 * 渲染设置页面
 * @param {HTMLElement} container
 * @param {Object} settings - 当前设置
 * @param {Function} onSave - 保存设置回调 (newSettings)
 * @param {Function} onBack - 返回回调
 * @param {Function} onExportAll - 导出全部数据回调
 * @param {Function} onClearAll - 清除全部数据回调
 */
export function renderSettings(container, settings, onSave, onBack, onExportAll, onClearAll) {
  const wageStandards = settings.wageStandards || [];
  const activeId = settings.activeWageStandardId;

  let html = '';

  // 页面头部
  html += `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <button class="header-btn" id="btn-settings-back">←</button>
      <div style="font-weight:700;font-size:1.1rem;">设置</div>
      <div style="width:36px;"></div>
    </div>
  `;

  // 工资标准管理
  html += '<div class="settings-section">';
  html += '<div class="settings-section-title">工资标准</div>';

  wageStandards.forEach((wage, index) => {
    const isActive = wage.id === activeId;
    html += `
      <div class="wage-card${isActive ? ' active-wage' : ''}" data-wage-id="${wage.id}">
        <div class="wage-info">
          <div class="wage-name">${escapeHtml(wage.name)}</div>
          <div class="wage-rates">正常: ${wage.normalRate}元/h · 加班: ${wage.overtimeRate}元/h</div>
        </div>
        ${isActive ? '<span class="wage-check">✓</span>' : ''}
      </div>
    `;
  });

  html += '<button class="btn-add-extra" id="btn-add-wage" style="margin-top:4px;">+ 添加新工资标准</button>';
  html += '</div>';

  // 数据管理
  html += '<div class="settings-section">';
  html += '<div class="settings-section-title">数据管理</div>';

  html += `
    <div class="settings-item" id="btn-export-data">
      <span class="settings-item-label">📥 导出全部数据 (CSV)</span>
      <span class="settings-item-arrow">›</span>
    </div>
    <div class="settings-item danger" id="btn-clear-data">
      <span class="settings-item-label">🗑 清除全部数据</span>
      <span class="settings-item-arrow">›</span>
    </div>
  `;
  html += '</div>';

  // 关于
  html += '<div class="settings-version">记工时账单 v1.0.0</div>';

  container.innerHTML = html;

  // 返回按钮
  document.getElementById('btn-settings-back').addEventListener('click', () => {
    if (onBack) onBack();
  });

  // 点击工资卡片 - 设为默认
  container.querySelectorAll('.wage-card').forEach(card => {
    card.addEventListener('click', () => {
      const wageId = card.dataset.wageId;
      settings.activeWageStandardId = wageId;
      onSave(settings);
    });
  });

  // 长按工资卡片 - 编辑或删除
  container.querySelectorAll('.wage-card').forEach(card => {
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const wageId = card.dataset.wageId;
      const wage = wageStandards.find(w => w.id === wageId);
      if (wage) {
        showWageEditModal(wage, (updatedWage) => {
          const idx = wageStandards.findIndex(w => w.id === updatedWage.id);
          if (idx >= 0) {
            wageStandards[idx] = updatedWage;
            onSave(settings);
          }
        }, () => {
          // 删除
          if (wageStandards.length <= 1) {
            showToast('至少保留一个工资标准');
            return;
          }
          const idx = wageStandards.findIndex(w => w.id === wageId);
          if (idx >= 0) {
            wageStandards.splice(idx, 1);
            // 如果删除的是激活的，切换到第一个
            if (settings.activeWageStandardId === wageId) {
              settings.activeWageStandardId = wageStandards[0].id;
            }
            onSave(settings);
          }
        });
      }
    });

    // 移动端长按（使用 touch 事件模拟）
    let longPressTimer;
    card.addEventListener('touchstart', () => {
      longPressTimer = setTimeout(() => {
        const wageId = card.dataset.wageId;
        const wage = wageStandards.find(w => w.id === wageId);
        if (wage) {
          showWageEditModal(wage, (updatedWage) => {
            const idx = wageStandards.findIndex(w => w.id === updatedWage.id);
            if (idx >= 0) {
              wageStandards[idx] = updatedWage;
              onSave(settings);
            }
          }, () => {
            if (wageStandards.length <= 1) {
              showToast('至少保留一个工资标准');
              return;
            }
            const idx = wageStandards.findIndex(w => w.id === wageId);
            if (idx >= 0) {
              wageStandards.splice(idx, 1);
              if (settings.activeWageStandardId === wageId) {
                settings.activeWageStandardId = wageStandards[0].id;
              }
              onSave(settings);
            }
          });
        }
      }, 600);
    });
    card.addEventListener('touchend', () => clearTimeout(longPressTimer));
    card.addEventListener('touchmove', () => clearTimeout(longPressTimer));
  });

  // 添加新工资标准
  document.getElementById('btn-add-wage').addEventListener('click', () => {
    showWageEditModal(null, (newWage) => {
      wageStandards.push(newWage);
      onSave(settings);
    });
  });

  // 导出数据
  document.getElementById('btn-export-data').addEventListener('click', () => {
    if (onExportAll) onExportAll();
  });

  // 清除数据
  document.getElementById('btn-clear-data').addEventListener('click', () => {
    showConfirmDialog('确定要清除全部数据吗？这将删除所有工时记录和设置，此操作不可恢复。', () => {
      if (onClearAll) onClearAll();
    });
  });
}

/**
 * 显示工资标准编辑弹窗
 */
function showWageEditModal(wage, onSave, onDelete) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const isNew = !wage;
  const data = wage || { id: generateId(), name: '', normalRate: 35, overtimeRate: 50 };

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title">${isNew ? '添加工资标准' : '编辑工资标准'}</div>
      <div class="form-group">
        <label class="form-label">名称</label>
        <input type="text" class="form-input" id="wage-name-input"
               value="${escapeHtml(data.name)}" placeholder="如：标准、项目A...">
      </div>
      <div class="form-group">
        <label class="form-label">正常时薪（元/小时）</label>
        <input type="number" class="form-input" id="wage-normal-input"
               value="${data.normalRate}" min="0" step="1" inputmode="numeric">
      </div>
      <div class="form-group">
        <label class="form-label">加班时薪（元/小时）</label>
        <input type="number" class="form-input" id="wage-overtime-input"
               value="${data.overtimeRate}" min="0" step="1" inputmode="numeric">
      </div>
      <button class="btn btn-primary" id="wage-save-btn">保存</button>
      ${!isNew ? '<button class="btn btn-danger" id="wage-delete-btn" style="margin-top:8px;">删除此标准</button>' : ''}
      <button class="btn btn-secondary" id="wage-cancel-btn" style="margin-top:8px;">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.getElementById('wage-cancel-btn').addEventListener('click', closeModal);

  document.getElementById('wage-save-btn').addEventListener('click', () => {
    const name = document.getElementById('wage-name-input').value.trim();
    const normalRate = parseInt(document.getElementById('wage-normal-input').value) || 0;
    const overtimeRate = parseInt(document.getElementById('wage-overtime-input').value) || 0;

    if (!name) {
      showToast('请输入名称');
      return;
    }
    if (normalRate <= 0) {
      showToast('正常时薪必须大于0');
      return;
    }

    closeModal();
    onSave({ ...data, name, normalRate, overtimeRate });
  });

  if (!isNew) {
    document.getElementById('wage-delete-btn').addEventListener('click', () => {
      closeModal();
      if (onDelete) onDelete();
    });
  }
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
        <button class="btn btn-danger" id="confirm-yes-btn">确定</button>
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message) {
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
