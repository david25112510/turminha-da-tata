"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  /** PNG em data URL (base64) — só o traço final consolidado, nada é persistido por movimento. */
  toDataURL: () => string;
  /**
   * Recalcula o tamanho do bitmap interno a partir do layout atual. Necessário quando o canvas é
   * montado dentro de um passo ainda escondido (`display: none` tem caixa de layout zerada — ver
   * ContractAcceptanceCard, que mantém os 3 passos montados e só alterna visibilidade) — o pai deve
   * chamar isso ao tornar o canvas visível, senão o desenho vai para um bitmap 0×0.
   */
  resize: () => void;
};

/**
 * Área de assinatura por caneta/dedo/mouse — Pointer Events cobre os três com uma única API, sem
 * precisar de biblioteca (nenhuma existia no projeto). `touch-action: none` no canvas evita que o
 * gesto de desenhar role a página sem querer no celular. Desacoplado de qualquer noção de
 * "contrato" — é só uma superfície de desenho reutilizável.
 */
export const SignaturePad = forwardRef<
  SignaturePadHandle,
  { className?: string; onChange?: (empty: boolean) => void }
>(function SignaturePad({ className, onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmptyState] = useState(true);

  function setEmpty(value: boolean) {
    setEmptyState(value);
    onChange?.(value);
  }

  function getContext() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = getContext();
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#2b2116";
  }

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    const last = lastPointRef.current;
    const point = pointFromEvent(e);
    if (!ctx || !last) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
    setEmpty(false);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      const ctx = getContext();
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setEmpty(true);
    },
    isEmpty() {
      return empty;
    },
    toDataURL() {
      return canvasRef.current?.toDataURL("image/png") ?? "";
    },
    resize: resizeCanvas,
  }));

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={empty ? "Área de assinatura, vazia" : "Área de assinatura, preenchida"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={
        className ??
        "w-full max-w-[600px] h-[200px] bg-white border-2 border-tata-border rounded-tata-lg [touch-action:none] cursor-crosshair"
      }
    />
  );
});
