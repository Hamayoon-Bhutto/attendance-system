/**
 * Pakistan localization standards for currency and dates:
 * - Currency: Rs. (or PKR) with standard grouping e.g. "Rs. 4,500"
 * - Date: DD/MM/YYYY or DD-MMM-YYYY (e.g. "17/09/2026", "17 Sep 2026")
 * - Timezone: Asia/Karachi (PKT - UTC+5)
 */

/**
 * Format currency to Pakistan standard: "Rs. 4,000"
 */
export function formatPKR(amount: number | string | undefined | null, prefix = 'Rs. '): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return `${prefix}${num.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

/**
 * Format date string (YYYY-MM-DD or ISO) to Pakistan standard:
 * 'short' -> '17/09/2026'
 * 'medium' -> '17 Sep 2026'
 * 'long' -> 'Thursday, 17 September 2026'
 */
export function formatPKDate(
  dateInput: string | Date | undefined | null,
  style: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!dateInput) return '—';
  
  try {
    let dateObj: Date;
    if (typeof dateInput === 'string') {
      if (dateInput.length === 10 && dateInput.includes('-')) {
        // YYYY-MM-DD format: treat as local to prevent timezone skew
        const [y, m, d] = dateInput.split('-').map(Number);
        dateObj = new Date(y, m - 1, d);
      } else {
        dateObj = new Date(dateInput);
      }
    } else {
      dateObj = dateInput;
    }

    if (isNaN(dateObj.getTime())) return String(dateInput);

    if (style === 'short') {
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = dateObj.getFullYear();
      return `${d}/${m}/${y}`;
    }

    if (style === 'medium') {
      return dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    return dateObj.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Format a month identifier (e.g. "2026-09" or "2026-09-01") to "September 2026"
 */
export function formatPKMonth(monthStr: string | undefined | null): string {
  if (!monthStr) return '—';
  try {
    const parts = monthStr.split('-');
    if (parts.length >= 2) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const d = new Date(year, month - 1, 1);
      return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }
    return monthStr;
  } catch {
    return monthStr;
  }
}

/**
 * Format current live time in PKT timezone or local formatted 12-hour AM/PM
 */
export function formatPKLiveClock(date: Date = new Date()): {
  dateFormatted: string;
  timeFormatted: string;
  fullPakistanString: string;
} {
  const dateFormatted = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  });

  const timeFormatted = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi',
  });

  return {
    dateFormatted,
    timeFormatted,
    fullPakistanString: `${dateFormatted} • ${timeFormatted} PKT`,
  };
}
