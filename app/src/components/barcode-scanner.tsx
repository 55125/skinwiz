"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ScanBarcode, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { gtinFromRead, RETAIL_FORMATS } from "@/lib/barcode-read";

// Scan a product's barcode with the phone camera and open it: the code goes
// to /search, which jumps straight to the product (lib/product-codes.ts).
// Uses the browser's own BarcodeDetector where there is one (Android
// Chrome); elsewhere (iPhone Safari) zxing-wasm, loaded only on first use
// from our own origin (app/vendor/zxing_reader.wasm). Frames never leave
// the phone.

type Detect = (video: HTMLVideoElement) => Promise<string | null>;

declare global {
  interface Window {
    BarcodeDetector?: {
      new (opts: { formats: string[] }): { detect(src: CanvasImageSource): Promise<{ rawValue: string; format: string }[]> };
      getSupportedFormats(): Promise<string[]>;
    };
  }
}

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "data_matrix"];

async function nativeDetector(): Promise<Detect | null> {
  const BD = window.BarcodeDetector;
  if (!BD) return null;
  try {
    const supported = await BD.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (!formats.includes("ean_13")) return null;
    const detector = new BD({ formats });
    return async (video) => {
      for (const r of await detector.detect(video)) {
        const gtin = gtinFromRead(r.rawValue, r.format);
        if (gtin) return gtin;
      }
      return null;
    };
  } catch {
    return null;
  }
}

async function zxingDetector(): Promise<Detect> {
  const { prepareZXingModule, readBarcodes, ZXING_WASM_VERSION } = await import("zxing-wasm/reader");
  prepareZXingModule({
    overrides: { locateFile: (p: string, prefix: string) => (p.endsWith(".wasm") ? `/vendor/zxing_reader.wasm?v=${ZXING_WASM_VERSION}` : prefix + p) },
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return async (video) => {
    if (!video.videoWidth) return null;
    // A centered crop of the frame: the barcode is where the guide box is,
    // and a smaller image decodes faster on older phones.
    const w = Math.round(video.videoWidth * 0.8);
    const h = Math.round(video.videoHeight * 0.5);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, (video.videoWidth - w) / 2, (video.videoHeight - h) / 2, w, h, 0, 0, w, h);
    const results = await readBarcodes(ctx.getImageData(0, 0, w, h), {
      formats: [...RETAIL_FORMATS],
      tryHarder: true,
      maxNumberOfSymbols: 1,
    });
    for (const r of results) {
      const gtin = r.isValid ? gtinFromRead(r.text, r.format) : null;
      if (gtin) return gtin;
    }
    return null;
  };
}

/** A phone or tablet that can open a camera (touch screen, secure context, getUserMedia). */
export function canScan(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    window.isSecureContext &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function BarcodeScanButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Focus goes back to the scan button when the full-screen scanner closes.
  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);
  // Decided after mount: the server can't know whether there's a camera.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setAvailable(canScan()), []);
  if (!available) return null;
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Scan a barcode"
        title="Scan a barcode"
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <ScanBarcode className="h-4.5 w-4.5" strokeWidth={1.75} />
      </button>
      {open && createPortal(<ScannerOverlay onClose={close} />, document.body)}
    </>
  );
}

function ScannerOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The dialog covers the page, so focus moves into it (its only control is Close).
  useEffect(() => closeRef.current?.focus(), []);
  const [status, setStatus] = useState<"starting" | "scanning" | "denied" | "error">("starting");

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        if (!stopped) setStatus((err as Error).name === "NotAllowedError" ? "denied" : "error");
        return;
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => {});
      let detect: Detect;
      try {
        detect = (await nativeDetector()) ?? (await zxingDetector());
      } catch {
        if (!stopped) setStatus("error");
        return;
      }
      if (stopped) return;
      setStatus("scanning");
      const tick = async () => {
        if (stopped) return;
        let code: string | null = null;
        try {
          code = await detect(video);
        } catch {
          // a frame that fails to decode is just the next frame's job
        }
        if (stopped) return;
        if (code) {
          navigator.vibrate?.(60);
          stopped = true;
          stream?.getTracks().forEach((t) => t.stop());
          onClose();
          router.push(`/search?q=${encodeURIComponent(code)}`);
          return;
        }
        timer = setTimeout(tick, 200);
      };
      tick();
    })();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, router]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Scan a barcode" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium">Scan a product barcode</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[40%] w-[80%] max-w-md rounded-2xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
        </div>
      </div>
      <p className="px-6 py-5 text-center text-sm text-white/80" aria-live="polite">
        {status === "starting" && "Starting the camera…"}
        {status === "scanning" && "Hold the barcode inside the box."}
        {status === "denied" && "Camera access is off. Allow it for this site in your browser settings, or type the number under the barcode into search."}
        {status === "error" && "The camera couldn't start. You can type the number under the barcode into search instead."}
      </p>
    </div>
  );
}
