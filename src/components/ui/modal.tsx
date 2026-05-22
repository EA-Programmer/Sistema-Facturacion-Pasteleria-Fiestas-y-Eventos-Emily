"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ModalProps = {
  children: React.ReactNode;
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
  width?: "md" | "lg" | "xl";
};

const widths = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  children,
  description,
  onClose,
  open,
  title,
  width = "lg",
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <button
        aria-label="Cerrar ventana"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "animate-modal-panel relative max-h-[90vh] w-full overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-2xl shadow-slate-950/20",
          widths[width],
        )}
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--chocolate)]" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Cerrar ventana"
            className="focus-ring grid size-9 place-items-center rounded-lg border border-[var(--line)] bg-white text-slate-600 hover:bg-pink-50 hover:text-[var(--berry)]"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-96px)] overflow-y-auto p-5">{children}</div>
      </section>
    </div>,
    document.body
  );
}

