"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button, Copy, Download, Printer, Skeleton } from "@/components/ui";
import { toast } from "@/components/toast";
import { Mark } from "@/components/marketing/chrome";

/**
 * The permanent QR for a business, drawn as the poster it will become: big code,
 * one instruction, and the address in words underneath for anyone whose camera
 * won't cooperate.
 *
 * Icons are on these buttons because each one names a different destination for
 * the same artwork — screen, printer, clipboard — and the verb alone is easy to
 * misread at a glance.
 */
export function QrPoster({
  slug,
  businessName,
  url,
  compact,
}: {
  slug: string;
  businessName: string;
  url: string;
  compact?: boolean;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 1024,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#101317ff", light: "#ffffffff" },
    })
      .then((png) => !cancelled && setDataUrl(png))
      .catch(() => !cancelled && setDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function downloadPng() {
    setDownloading(true);
    try {
      // Re-rendered at print resolution rather than upscaling the screen copy.
      const png = await QRCode.toDataURL(url, {
        width: 2048,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#101317ff", light: "#ffffffff" },
      });
      const a = document.createElement("a");
      a.href = png;
      a.download = `${slug}-queue-qr.png`;
      a.click();
      toast("QR code downloaded", "success");
    } catch {
      toast("We couldn't generate the file. Please try again.", "error");
    } finally {
      setDownloading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied", "success");
    } catch {
      toast("Your browser blocked the copy. Select the address to copy it.", "error");
    }
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-[21rem] rounded-[var(--radius-lg)] bg-white px-8 py-10 text-center shadow-[var(--shadow-1)] print:shadow-none">
        <p className="t-h3 text-[var(--color-ink)]">{businessName}</p>

        <div className="mt-7 flex justify-center">
          {dataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={dataUrl}
              alt={`QR code for ${url}`}
              width={208}
              height={208}
              className="size-52"
            />
          ) : (
            <Skeleton className="size-52 rounded-[var(--radius-md)]" />
          )}
        </div>

        <p className="mt-7 text-[1.25rem] font-semibold tracking-[-0.022em] text-[var(--color-ink)]">
          Join our queue
        </p>
        <p className="mx-auto mt-1.5 max-w-[26ch] t-body-sm text-[var(--color-ink-2)]">
          Scan to take a number, then wait wherever you like.
        </p>

        <p className="mt-6 t-body-sm text-[var(--color-ink-3)]">
          {url.replace(/^https?:\/\//, "")}
        </p>

        <div className="mt-7 flex items-center justify-center gap-1.5 opacity-50">
          <Mark size={12} />
          <span className="t-meta text-[var(--color-ink-3)]">QyoFlow</span>
        </div>
      </div>

      {!compact && (
        <div className="no-print mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={downloadPng} loading={downloading} disabled={!dataUrl}>
            <Download />
            Download PNG
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
          <Button variant="tertiary" onClick={copyLink}>
            <Copy />
            Copy link
          </Button>
        </div>
      )}
    </div>
  );
}
