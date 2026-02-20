import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/**
 * Centralized DnD sensors with mobile-safe configuration.
 * - PointerSensor with distance constraint avoids accidental drag during scroll
 * - TouchSensor with delay/tolerance prevents conflicting with native mobile scroll
 * - KeyboardSensor for accessibility
 */
export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}
