import { encode } from "uqr";

// A QR code as inline SVG: one path, crisp at any print size, black on white
// whatever the theme (scanners need the contrast). Quiet zone included.
export function QrCode({ value, className, title }: { value: string; className?: string; title?: string }) {
  const { size, data } = encode(value, { ecc: "M", border: 4 });
  let d = "";
  data.forEach((row, y) => {
    let x = 0;
    while (x < size) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && row[x]) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={title ?? "QR code"} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
