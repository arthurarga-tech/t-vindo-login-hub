import { useMemo } from "react";
import { 
  getNowInSaoPaulo, 
  getCurrentDayInSaoPaulo, 
  getCurrentMinutesInSaoPaulo,
  isTodayInSaoPaulo,
  formatInSaoPaulo
} from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

type DayKey = keyof OpeningHours;

const dayMapping: Record<number, DayKey> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

const dayLabels: Record<DayKey, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

const dayOrder: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export interface ScheduleSlot {
  time: string;
  label: string;
}

export interface AvailableDay {
  date: Date;
  dayKey: DayKey;
  label: string;
  dayLabel: string;
}

export function useStoreOpeningHours(
  openingHours: OpeningHours | null | undefined,
  isTemporaryClosed?: boolean
) {
  return useMemo(() => {
    const checkIsOpen = (): boolean => {
      // If temporarily closed, always return false
      if (isTemporaryClosed) return false;
      
      if (!openingHours) return true; // If no opening hours configured, assume open
      const currentDay = dayMapping[getCurrentDayInSaoPaulo()];
      const todayHours = openingHours[currentDay];

      if (!todayHours || todayHours.closed) return false;

      const currentMinutes = getCurrentMinutesInSaoPaulo();
      const openMinutes = timeToMinutes(todayHours.open);
      const closeMinutes = timeToMinutes(todayHours.close);

      // Handle cases where close time is past midnight (e.g., open 18:00, close 02:00)
      if (closeMinutes < openMinutes) {
        // Store closes after midnight
        return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
      }

      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    };

    const getNextOpenTime = (): { day: string; time: string } | null => {
      if (!openingHours) return null;

      const now = getNowInSaoPaulo();
      const currentDayIndex = getCurrentDayInSaoPaulo();
      const currentMinutes = getCurrentMinutesInSaoPaulo();
      const currentDayKey = dayMapping[currentDayIndex];
      const todayHours = openingHours[currentDayKey];

      // Check if will open later today
      if (todayHours && !todayHours.closed) {
        const openMinutes = timeToMinutes(todayHours.open);
        if (currentMinutes < openMinutes) {
          return { day: "Hoje", time: todayHours.open };
        }
      }

      // Check next 7 days
      for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (currentDayIndex + i) % 7;
        const nextDayKey = dayMapping[nextDayIndex];
        const nextDayHours = openingHours[nextDayKey];

        if (nextDayHours && !nextDayHours.closed) {
          const dayLabel = i === 1 ? "Amanhã" : dayLabels[nextDayKey];
          return { day: dayLabel, time: nextDayHours.open };
        }
      }

      return null;
    };

    const getTodayHours = (): DayHours | null => {
      if (!openingHours) return null;
      const currentDayKey = dayMapping[getCurrentDayInSaoPaulo()];
      return openingHours[currentDayKey] || null;
    };

    const getAvailableScheduleSlots = (date: Date): ScheduleSlot[] => {
      if (!openingHours) return [];

      const dayKey = dayMapping[date.getDay()];
      const dayHours = openingHours[dayKey];

      if (!dayHours || dayHours.closed) return [];

      const slots: ScheduleSlot[] = [];
      const openMinutes = timeToMinutes(dayHours.open);
      let closeMinutes = timeToMinutes(dayHours.close);

      // Handle overnight hours
      if (closeMinutes < openMinutes) {
        closeMinutes += 24 * 60;
      }

      const now = getNowInSaoPaulo();
      const isToday = isTodayInSaoPaulo(date);
      const currentMinutes = isToday ? getCurrentMinutesInSaoPaulo() : 0;

      // Generate slots every 30 minutes, starting at least 30 minutes from now
      const minStartTime = isToday ? currentMinutes + 30 : openMinutes;
      const startSlot = Math.max(openMinutes, Math.ceil(minStartTime / 30) * 30);

      for (let minutes = startSlot; minutes < closeMinutes - 15; minutes += 30) {
        const displayMinutes = minutes % (24 * 60);
        const time = minutesToTime(displayMinutes);
        slots.push({
          time,
          label: time,
        });
      }

      return slots;
    };

    const getNextAvailableDays = (count: number = 7): AvailableDay[] => {
      if (!openingHours) return [];

      const days: AvailableDay[] = [];
      const now = getNowInSaoPaulo();

      for (let i = 0; i <= 14 && days.length < count; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);

        const dayKey = dayMapping[date.getDay()];
        const dayHours = openingHours[dayKey];

        if (dayHours && !dayHours.closed) {
          // For today, check if there's still time to schedule
          if (i === 0) {
            const slots = getAvailableScheduleSlots(date);
            if (slots.length === 0) continue;
          }

          let label: string;
          if (i === 0) {
            label = "Hoje";
          } else if (i === 1) {
            label = "Amanhã";
          } else {
            label = formatInSaoPaulo(date, "EEE, dd/MM", { locale: ptBR });
          }

          days.push({
            date,
            dayKey,
            label,
            dayLabel: dayLabels[dayKey],
          });
        }
      }

      return days;
    };

    const isOpen = checkIsOpen();
    const nextOpenTime = !isOpen ? getNextOpenTime() : null;
    const todayHours = getTodayHours();

    return {
      isOpen,
      nextOpenTime,
      todayHours,
      hasOpeningHours: !!openingHours,
      getAvailableScheduleSlots,
      getNextAvailableDays,
    };
  }, [openingHours, isTemporaryClosed]);
}
