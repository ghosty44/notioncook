import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

export const toDateKey = (date) => format(date, 'yyyy-MM-dd');

export const formatDayLabel = (date) =>
  format(date, 'EEE d MMM', { locale: fr });

export const formatMonthYear = (date) =>
  format(date, 'MMMM yyyy', { locale: fr });

export function getWeekDays(referenceDate = new Date()) {
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

export const SLOT_LABELS = {
  breakfast: '🌅 Petit-déjeuner',
  lunch: '☀️ Déjeuner',
  dinner: '🌙 Dîner',
};

export const SLOT_KEYS = ['breakfast', 'lunch', 'dinner'];
