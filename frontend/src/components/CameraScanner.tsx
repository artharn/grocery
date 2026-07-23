import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useTranslation } from "react-i18next";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

// Modal camera scanner for both QR and 1D barcodes, per fe-standard.md
// §5. This is always an alternative input path alongside the plain text
// field in BarcodeInput — never the only way to enter a code.
//
// Uses @zxing/browser rather than html5-qrcode: the latter drives its scan
// loop off a manual setTimeout + canvas-draw cycle, which is a well-known,
// long-unresolved compatibility problem on iOS Safari (the video stream
// visibly plays but decode silently never fires — see
// https://github.com/mebjas/html5-qrcode/issues/484 and /512, both
// unresolved upstream). @zxing/browser decodes straight off the <video>
// element via requestAnimationFrame instead, which doesn't hit that bug.
export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<{ message: string } | "generic" | null>(null);

  // See CameraScanner's git history for why onScan is read via a ref
  // rather than as an effect dependency: it's a new function reference on
  // every parent render, and including it in the deps array would restart
  // the camera stream on any unrelated re-render, before a frame could
  // ever be decoded.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let stopped = false;
    let controls: IScannerControls | null = null;
    const handleStartError = (err: unknown) => {
      if (stopped) return; // effect already cleaned up — ignore
      setError(err instanceof Error ? { message: err.message } : "generic");
    };

    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, _err, ctrl) => {
          // The callback fires on every scan attempt, success or not —
          // "nothing decoded in this frame" is the overwhelmingly common
          // case and isn't an error worth surfacing, only a real result is.
          if (stopped || !result) return;
          stopped = true;
          ctrl.stop();
          onScanRef.current(result.getText());
        }
      )
      .then((c) => {
        if (stopped) {
          // Cleanup already ran before this settled (e.g. the modal was
          // closed mid-permission-prompt) — stop the stream we just
          // opened instead of leaking an active camera.
          c.stop();
          return;
        }
        controls = c;
      })
      .catch(handleStartError);

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, []); // mount once, stop only on unmount — see onScanRef above

  const errorMessage = error
    ? error === "generic"
      ? t("camera.cameraErrorGeneric")
      : t("camera.cameraErrorWithMessage", { message: error.message })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">{t("camera.title")}</h2>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-gray-500 hover:bg-gray-100"
            aria-label={t("camera.close")}
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <p role="alert" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        <video
          ref={videoRef}
          className="w-full rounded-lg object-cover"
          style={{ display: errorMessage ? "none" : undefined }}
        />
      </div>
    </div>
  );
}
