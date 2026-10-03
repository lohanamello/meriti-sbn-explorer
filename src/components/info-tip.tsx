"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<CSSProperties | null>(null);

  function cancelClose() {
    if (closing.current) clearTimeout(closing.current);
  }

  function show() {
    cancelClose();
    const bounds = trigger.current?.getBoundingClientRect();
    if (!bounds) return;
    const width = Math.min(340, window.innerWidth - 24);
    const below = window.innerHeight - bounds.bottom >= 180;
    setPosition({ width, left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)),
      ...(below ? { top: bounds.bottom + 8 } : { bottom: window.innerHeight - bounds.top + 8 }) });
  }

  function closeSoon() {
    cancelClose();
    closing.current = setTimeout(() => setPosition(null), 150);
  }

  useEffect(() => {
    if (!position) return;
    function dismiss(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setPosition(null);
      } else if (!trigger.current?.contains(event.target as Node) && !tooltip.current?.contains(event.target as Node)) {
        setPosition(null);
      }
    }
    function reposition() { setPosition(null); }
    function followScroll(event: Event) {
      if (tooltip.current?.contains(event.target as Node)) return;
      const bounds = trigger.current?.getBoundingClientRect();
      if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
        setPosition(null);
        return;
      }
      const width = Math.min(340, window.innerWidth - 24);
      const below = window.innerHeight - bounds.bottom >= 180;
      setPosition({ width, left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)),
        ...(below ? { top: bounds.bottom + 8 } : { bottom: window.innerHeight - bounds.top + 8 }) });
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", followScroll, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", followScroll, true);
    };
  }, [position]);

  useEffect(() => () => { if (closing.current) clearTimeout(closing.current); }, []);

  return <span className="info-tip">
    <button ref={trigger} className="info-tip__trigger" type="button" aria-label={`Informações sobre ${label}`}
      aria-describedby={position ? id : undefined} aria-expanded={Boolean(position)}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") show(); }} onPointerLeave={(event) => { if (event.pointerType !== "touch") closeSoon(); }}
      onFocus={show} onBlur={closeSoon} onClick={show}>
      <Info size={15} aria-hidden="true" />
    </button>
    {position && createPortal(<div ref={tooltip} id={id} role="tooltip" className="info-tip__content" style={position}
      onPointerEnter={cancelClose} onPointerLeave={closeSoon}><strong>{label}</strong><div>{children}</div></div>, document.body)}
  </span>;
}
