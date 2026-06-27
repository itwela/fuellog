"use client";

import { useDragControls, type PanInfo } from "framer-motion";

/**
 * Adds drag-to-dismiss to any bottom sheet.
 * Spread `dragProps` onto the sheet's motion.div.
 * Add `onPointerDown={startDrag}` to the handle div only — so inner scroll still works.
 */
export function useSheetDismiss(onClose: () => void) {
  const controls = useDragControls();

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 80 || info.velocity.y > 400) {
      onClose();
    }
  }

  const dragProps = {
    drag: "y" as const,
    dragControls: controls,
    dragListener: false,
    dragConstraints: { top: 0 },
    dragElastic: { top: 0, bottom: 0.4 } as { top: number; bottom: number },
    onDragEnd,
  };

  function startDrag(e: React.PointerEvent) {
    controls.start(e);
  }

  return { dragProps, startDrag };
}
