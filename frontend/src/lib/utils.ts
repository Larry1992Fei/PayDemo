import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 经典且极其强大的 className 合并工具函数
 * 让组件在接入覆写样式时，后面的同属性 Tailwind 原子类能够智能且正确地覆盖前者。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
