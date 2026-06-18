/**
 * 显示 JSOS Toast 通知
 * @param {string} title - 标题
 * @param {'success'|'error'|'info'|'warning'} type - 类型
 * @param {string} [description] - 详细描述（可选）
 */
export function showToast(title, type = 'success', description) {
  if (window.JSOS) {
    window.JSOS.toast({ title, type, description })
  }
}
