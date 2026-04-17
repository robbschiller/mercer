import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Mercer — From trade show list to signed deal. The sales platform for exterior renovation.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0B0C0E";
const AMBER = "#E85D23";
const AMBER_SOFT = "#F28A54";

async function loadGoogleFont(cssUrl: string): Promise<ArrayBuffer> {
  const css = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  }).then((r) => r.text());
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format/);
  if (!match) throw new Error(`Could not parse Google font CSS: ${cssUrl}`);
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

export default async function OpenGraphImage() {
  const [fraunces, frauncesItalic, geist, geistBold, jetbrains] =
    await Promise.all([
      loadGoogleFont(
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@144,500&display=swap",
      ),
      loadGoogleFont(
        "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,144,500&display=swap",
      ),
      loadGoogleFont(
        "https://fonts.googleapis.com/css2?family=Geist:wght@400&display=swap",
      ),
      loadGoogleFont(
        "https://fonts.googleapis.com/css2?family=Geist:wght@600&display=swap",
      ),
      loadGoogleFont(
        "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&display=swap",
      ),
    ]);

  const gridSize = 60;
  const blueprintGrid = `linear-gradient(to right, rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.055) 1px, transparent 1px)`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          padding: "68px 80px 64px",
          background: INK,
          color: "white",
          fontFamily: "Geist",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Blueprint grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: blueprintGrid,
            backgroundSize: `${gridSize}px ${gridSize}px`,
          }}
        />
        {/* Amber top vignette */}
        <div
          style={{
            position: "absolute",
            top: "-260px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1400px",
            height: "700px",
            background: `radial-gradient(closest-side, rgba(232,93,35,0.22), rgba(232,93,35,0) 70%)`,
          }}
        />
        {/* Blueprint-blue bottom vignette */}
        <div
          style={{
            position: "absolute",
            bottom: "-260px",
            left: "30%",
            width: "900px",
            height: "500px",
            background: `radial-gradient(closest-side, rgba(30,58,95,0.4), rgba(30,58,95,0) 70%)`,
          }}
        />

        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span
              style={{
                fontFamily: "Fraunces",
                fontSize: 44,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              Mercer
            </span>
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 14,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              §&nbsp;sales platform
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px 8px 12px",
              borderRadius: 999,
              border: `1px solid ${AMBER}`,
              background: "rgba(232,93,35,0.14)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: AMBER,
              }}
            />
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 13,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: AMBER_SOFT,
              }}
            >
              Lead → Close
            </span>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <span
            style={{
              fontFamily: "Fraunces",
              fontSize: 132,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              color: "white",
            }}
          >
            From trade show list
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontFamily: "Fraunces",
              fontSize: 132,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              fontStyle: "italic",
              color: "rgba(255,255,255,0.96)",
              marginTop: 6,
            }}
          >
            <span>to signed deal</span>
            <span style={{ color: AMBER, fontStyle: "normal" }}>.</span>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            marginTop: 44,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <span
            style={{
              fontSize: 22,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.72)",
              maxWidth: 640,
            }}
          >
            The sales platform for exterior renovation contractors bidding
            multifamily.
          </span>

          <div style={{ display: "flex", gap: 28 }}>
            <KpiChip label="Leads" value="247" />
            <KpiChip label="Quoted" value="34" />
            <KpiChip label="Pipeline" value="$1.24M" accent />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Fraunces",
          data: fraunces,
          weight: 500,
          style: "normal",
        },
        {
          name: "Fraunces",
          data: frauncesItalic,
          weight: 500,
          style: "italic",
        },
        { name: "Geist", data: geist, weight: 400, style: "normal" },
        { name: "Geist", data: geistBold, weight: 600, style: "normal" },
        {
          name: "JetBrains Mono",
          data: jetbrains,
          weight: 500,
          style: "normal",
        },
      ],
    },
  );
}

/* -------------------------------------------------------------------------- */

function KpiChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "Fraunces",
          fontSize: 36,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: accent ? AMBER : "white",
        }}
      >
        {value}
      </span>
    </div>
  );
}
