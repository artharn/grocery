import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useTranslation } from "react-i18next";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

// Modal camera scanner for both QR and 1D barcodes, per fe-standard.md
// §5. This is always an alternative input path alongside the plain text
// field in BarcodeInput — never the only way to enter a code.
//
// Drives its own requestVideoFrameCallback loop instead of using
// @zxing/browser's built-in decodeFromConstraints (which — like
// html5-qrcode before it — schedules decode attempts on a plain
// setTimeout and captures each frame via canvas.drawImage(video)).
// Confirmed on a real device: that pattern works on Android Chrome but
// never decodes anything on iOS Safari, even though the <video> element
// itself keeps visibly playing — Safari is known to sometimes hand
// drawImage() a stale/frozen frame under a timer-driven capture loop
// (see e.g. https://github.com/mebjas/html5-qrcode/issues/890).
// requestVideoFrameCallback (Safari 15.4+) instead fires exactly when a
// new frame is composited, so each decode attempt reads a genuinely
// fresh frame regardless of browser.
export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<{ message: string } | "generic" | null>(null);

  // See below for why onScan is read via a ref rather than as an effect
  // dependency: it's a new function reference on every parent render, and
  // including it in the deps array would restart the camera stream on any
  // unrelated re-render, before a frame could ever be decoded.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    // Captured once: this modal renders the <video> unconditionally for
    // its whole lifetime, so the node itself never changes underneath
    // this effect — safe to read once and reuse in cleanup.
    const videoElement = videoRef.current;
    let stopped = false;
    let stream: MediaStream | null = null;
    let usingVideoFrameCallback = false;
    let frameHandle: number | null = null;

    const handleStartError = (err: unknown) => {
      if (stopped) return; // effect already cleaned up — ignore
      // getUserMedia can succeed (camera permission granted, stream
      // assigned to `stream` below) and video.play() still reject after —
      // stop the already-granted stream so the camera doesn't stay
      // active behind an error screen.
      stream?.getTracks().forEach((track) => track.stop());
      setError(err instanceof Error ? { message: err.message } : "generic");
    };

    const reader = new BrowserMultiFormatReader();

    const scheduleNextFrame = (callback: () => void) => {
      if (!videoElement) return;
      if (typeof videoElement.requestVideoFrameCallback === "function") {
        usingVideoFrameCallback = true;
        frameHandle = videoElement.requestVideoFrameCallback(callback);
      } else {
        usingVideoFrameCallback = false;
        frameHandle = requestAnimationFrame(callback);
      }
    };

    const scanFrame = () => {
      if (stopped || !videoElement) return;
      try {
        // decode() re-captures the CURRENT frame into a fresh canvas on
        // every call — it throws (NotFoundException, the overwhelmingly
        // common case) rather than returning when nothing decodes.
        const result = reader.decode(videoElement);
        if (stopped) return;
        stopped = true;
        // TEMP DEBUG — remove once confirmed fixed on the reporter's
        // iPhone. Fires on the raw decode result before any app logic
        // (onChange/onSubmit/BarcodeInput) runs.
        alert("SCAN OK, decoded: " + result.getText());
        onScanRef.current(result.getText());
        return; // got a result — don't schedule another frame
      } catch {
        // No code found in this frame — expected on nearly every call.
      }
      scheduleNextFrame(scanFrame);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((mediaStream) => {
        if (stopped) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        if (!videoElement) return;
        videoElement.srcObject = mediaStream;
        return videoElement.play().then(() => scheduleNextFrame(scanFrame));
      })
      .catch(handleStartError);

    return () => {
      stopped = true;
      if (frameHandle !== null) {
        if (usingVideoFrameCallback) {
          videoElement?.cancelVideoFrameCallback(frameHandle);
        } else {
          cancelAnimationFrame(frameHandle);
        }
      }
      stream?.getTracks().forEach((track) => track.stop());
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
          playsInline
          muted
          className="w-full rounded-lg object-cover"
          style={{ display: errorMessage ? "none" : undefined }}
        />
      </div>
    </div>
  );
}
