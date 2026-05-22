export type UiFeedbackLevel = 'info' | 'warning' | 'error' | 'success';

const PREFIX: Record<UiFeedbackLevel, string> = {
  info: '\u63d0\u793a',
  warning: '\u6ce8\u610f',
  error: '\u9519\u8bef',
  success: '\u6210\u529f',
};

export function showUiFeedback(level: UiFeedbackLevel, message: string) {
  window.alert(`${PREFIX[level]}\uff1a${message}`);
}

export function showUiError(message: string) {
  showUiFeedback('error', message);
}

export function showUiWarning(message: string) {
  showUiFeedback('warning', message);
}

export function getErrorMessage(error: unknown, fallback = '\u64cd\u4f5c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5') {
  return error instanceof Error ? error.message : fallback;
}
