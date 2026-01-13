import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStoreOpeningHours, ScheduleSlot, AvailableDay } from "@/hooks/useStoreOpeningHours";
import { formatInSaoPaulo } from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";

interface ScheduleSelectorProps {
  openingHours: any;
  onScheduleSelect: (date: Date | null) => void;
  selectedDate: Date | null;
}

export function ScheduleSelector({ openingHours, onScheduleSelect, selectedDate }: ScheduleSelectorProps) {
  const { getAvailableScheduleSlots, getNextAvailableDays } = useStoreOpeningHours(openingHours);
  
  const [availableDays, setAvailableDays] = useState<AvailableDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<AvailableDay | null>(null);
  const [availableSlots, setAvailableSlots] = useState<ScheduleSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Load available days on mount
  useEffect(() => {
    const days = getNextAvailableDays(7);
    setAvailableDays(days);
    
    // Auto-select first day if none selected
    if (days.length > 0 && !selectedDay) {
      setSelectedDay(days[0]);
    }
  }, [openingHours]);

  // Load slots when day changes
  useEffect(() => {
    if (selectedDay) {
      const slots = getAvailableScheduleSlots(selectedDay.date);
      setAvailableSlots(slots);
      setSelectedTime(null);
      onScheduleSelect(null);
    }
  }, [selectedDay]);

  // Update parent when time is selected
  useEffect(() => {
    if (selectedDay && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const scheduledDate = new Date(selectedDay.date);
      scheduledDate.setHours(hours, minutes, 0, 0);
      onScheduleSelect(scheduledDate);
    }
  }, [selectedTime]);

  const handleDaySelect = (day: AvailableDay) => {
    setSelectedDay(day);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  if (availableDays.length === 0) {
    return (
      <Card 
        className="border-muted"
        data-testid="schedule-selector-empty"
      >
        <CardContent className="pt-6 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Não há horários disponíveis para agendamento no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="border-primary/20"
      data-testid="schedule-selector"
      role="region"
      aria-label="Seletor de agendamento"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Agendar Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Day Selection */}
        <div className="space-y-2">
          <label 
            className="text-sm font-medium"
            id="schedule-day-label"
          >
            Escolha o dia
          </label>
          <ScrollArea className="w-full">
            <div 
              className="flex gap-2 pb-2"
              role="listbox"
              aria-labelledby="schedule-day-label"
              data-testid="schedule-selector-days"
            >
              {availableDays.map((day, index) => (
                <Button
                  key={day.date.toISOString()}
                  variant={selectedDay?.date.toISOString() === day.date.toISOString() ? "default" : "outline"}
                  size="sm"
                  className="flex-shrink-0 flex-col h-auto py-2 px-3"
                  onClick={() => handleDaySelect(day)}
                  data-testid={`schedule-day-${index}`}
                  role="option"
                  aria-selected={selectedDay?.date.toISOString() === day.date.toISOString()}
                >
                  <span className="text-xs font-normal">{day.label}</span>
                  {day.label !== "Hoje" && day.label !== "Amanhã" && (
                    <span className="text-[10px] text-muted-foreground">{day.dayLabel}</span>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Time Selection */}
        {selectedDay && (
          <div className="space-y-2">
            <label 
              className="text-sm font-medium flex items-center gap-2"
              id="schedule-time-label"
            >
              <Clock className="h-4 w-4" />
              Escolha o horário
            </label>
            {availableSlots.length > 0 ? (
              <div 
                className="grid grid-cols-4 sm:grid-cols-6 gap-2"
                role="listbox"
                aria-labelledby="schedule-time-label"
                data-testid="schedule-selector-times"
              >
                {availableSlots.map((slot, index) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    className="text-sm"
                    onClick={() => handleTimeSelect(slot.time)}
                    data-testid={`schedule-time-${index}`}
                    role="option"
                    aria-selected={selectedTime === slot.time}
                  >
                    {slot.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p 
                className="text-sm text-muted-foreground text-center py-4"
                data-testid="schedule-selector-no-slots"
              >
                Não há mais horários disponíveis para este dia.
              </p>
            )}
          </div>
        )}

        {/* Selected Schedule Display */}
        {selectedDate && (
          <div 
            className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg"
            data-testid="schedule-selector-confirmation"
            role="status"
            aria-live="polite"
          >
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">
              Agendado para {formatInSaoPaulo(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} às {formatInSaoPaulo(selectedDate, "HH:mm", { locale: ptBR })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
