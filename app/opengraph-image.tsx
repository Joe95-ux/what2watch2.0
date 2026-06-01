import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAME } from "@/lib/seo/metadata";

export const alt = `${SITE_NAME} — Discover your next favorite watch`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  let logoSrc: string | null = null;
  try {
    const logoData = await readFile(
      join(process.cwd(), "public/what2watch-logo.png"),
    );
    logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;
  } catch {
    // Logo optional — text-only fallback still renders
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0a0f0d 0%, #0f1a16 45%, #052e1f 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16, 185, 129, 0.18) 0%, transparent 60%)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 64px",
            textAlign: "center",
          }}
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              width={420}
              height={100}
              style={{ objectFit: "contain", marginBottom: 40 }}
            />
          ) : (
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "#ecfdf5",
                marginBottom: 40,
                letterSpacing: "-0.02em",
              }}
            >
              {SITE_NAME}
            </div>
          )}
          <p
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#a7f3d0",
              margin: 0,
              maxWidth: 800,
              lineHeight: 1.35,
            }}
          >
            Find where to watch movies and TV — stream, rent, or buy
          </p>
          <p
            style={{
              fontSize: 22,
              color: "#6ee7b7",
              marginTop: 20,
              opacity: 0.85,
            }}
          >
            what2watch.net
          </p>
        </div>
      </div>
    ),
    { ...size },
  );
}
