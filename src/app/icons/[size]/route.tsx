import { ImageResponse } from "next/og";
import { appConfig } from "@/config/app";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam.replace(/[^0-9]/g, "")) || 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16213a",
          borderRadius: size * 0.18,
        }}
      >
        <div
          style={{
            color: "#b8862b",
            fontSize: size * 0.56,
            fontWeight: 700,
            fontFamily: "Georgia, serif",
          }}
        >
          {appConfig.appName.charAt(0)}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
