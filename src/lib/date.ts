import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const weekday = format(date, "EEEE", { locale: zhCN });
    return `${format(date, "yyyy-MM-dd", { locale: zhCN })} ${weekday}`;
  } catch {
    return dateStr;
  }
}

export function formatDateLong(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, "yyyy 年 M 月 d 日", { locale: zhCN });
  } catch {
    return dateStr;
  }
}
