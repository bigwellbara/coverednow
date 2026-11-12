import { ImageResponse } from "next/og";

export const SHARE_CARD_SIZE = { width: 1200, height: 630 };

/**
 * The picture WhatsApp, Facebook and others show when a link is shared: the
 * brand, a headline, and a progress bar. Satori draws it, so every box with more
 * than one child needs display: flex.
 */
export function shareCard(card: {
  eyebrow: string;
  title: string;
  detail: string;
  /** 0 to 100, or null to leave the bar out. */
  percent: number | null;
  figure?: string;
}) {
  const percent = card.percent === null ? null : Math.max(0, Math.min(card.percent, 100));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(160deg, #3a3a3c 0%, #1d1d1f 45%, #0b0b0c 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(180deg, #ecdcbd, #b49064)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 600,
              color: "#0b0b0c",
            }}
          >
            C
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>
            Covered<span style={{ color: "#d6c09b" }}>Now</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#d6c09b", textTransform: "uppercase", letterSpacing: 2 }}>
            {card.eyebrow}
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 600, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1000 }}>
            {card.title}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.7)" }}>{card.detail}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {card.figure && (
            <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#d6c09b" }}>{card.figure}</div>
          )}
          {percent !== null && (
            <div style={{ display: "flex", width: "100%", height: 22, borderRadius: 11, background: "rgba(255,255,255,0.12)" }}>
              <div
                style={{
                  display: "flex",
                  width: `${Math.max(percent, 2)}%`,
                  height: 22,
                  borderRadius: 11,
                  background: "linear-gradient(90deg, #987752, #d6c09b)",
                }}
              />
            </div>
          )}
          <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.5)" }}>
            Confirmed by the school. Paid straight to the school.
          </div>
        </div>
      </div>
    ),
    SHARE_CARD_SIZE,
  );
}
