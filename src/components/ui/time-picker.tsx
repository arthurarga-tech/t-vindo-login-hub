import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];

export function TimePicker({
  value = "",
  onChange,
  disabled = false,
  className,
  placeholder = "Selecionar",
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  const [selectedHour, selectedMinute] = React.useMemo(() => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":");
      return [h, m];
    }
    return ["", ""];
  }, [value]);

  const handleTimeSelect = (hour: string, minute: string) => {
    const newTime = `${hour}:${minute}`;
    onChange?.(newTime);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {value || placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="flex">
          {/* Hours column */}
          <div className="flex-1 border-r border-border">
            <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b border-border">
              Hora
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant={selectedHour === hour ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      const min = selectedMinute || "00";
                      handleTimeSelect(hour, min);
                    }}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Minutes column */}
          <div className="flex-1">
            <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b border-border">
              Min
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    variant={selectedMinute === minute ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      const hr = selectedHour || "08";
                      handleTimeSelect(hr, minute);
                    }}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
