import { useMemo } from "react";

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

function currentTimeToMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function useStoreOpeningHours(openingHours: OpeningHours | null | undefined) {
  return useMemo(() => {
    const checkIsOpen = (): boolean => {
      if (!openingHours) return true; // If no opening hours configured, assume open

      const now = new Date();
      const currentDay = dayMapping[now.getDay()];
      const todayHours = openingHours[currentDay];

      if (!todayHours || todayHours.closed) return false;

      const currentMinutes = currentTimeToMinutes();
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

      const now = new Date();
      const currentDayIndex = now.getDay();
      const currentMinutes = currentTimeToMinutes();
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
      const currentDayKey = dayMapping[new Date().getDay()];
      return openingHours[currentDayKey] || null;
    };

    const isOpen = checkIsOpen();
    const nextOpenTime = !isOpen ? getNextOpenTime() : null;
    const todayHours = getTodayHours();

    return {
      isOpen,
      nextOpenTime,
      todayHours,
      hasOpeningHours: !!openingHours,
    };
  }, [openingHours]);
}
