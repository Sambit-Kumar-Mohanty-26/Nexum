import { NextResponse } from "next/server";
import { extractFromText } from "@/lib/resumeParser";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let extractedText = "";
    let fileName = "resume.pdf";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("resume") as File | null;

      if (file) {
        fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        // 1. Primary Universal Extractor: unpdf (Mozilla PDF.js standards)
        try {
          // @ts-expect-error unpdf is an optional runtime dependency
          const { extractText } = await import("unpdf");
          const result = await extractText(uint8);
          extractedText = Array.isArray(result.text) ? result.text.join("\n") : (result.text || "");
        } catch (unpdfErr) {
          console.warn("unpdf extraction notice:", unpdfErr);
        }

        // 2. Secondary fallback: pdf-parse
        if (!extractedText || extractedText.trim().length === 0) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const pdfParse = require("pdf-parse");
            const pdfData = await pdfParse(Buffer.from(arrayBuffer));
            if (pdfData && pdfData.text) {
              extractedText = pdfData.text;
            }
          } catch (pdfErr) {
            console.warn("pdf-parse fallback notice:", pdfErr);
          }
        }

        // 3. Clean fallback: filter out PDF stream tokens
        if (!extractedText || extractedText.includes("%PDF-")) {
          const rawStr = Buffer.from(arrayBuffer).toString("latin1");
          const matches = rawStr.match(/[\x20-\x7E\t\r\n]{4,}/g);
          if (matches) {
            extractedText = matches
              .filter((m) => !/(\/Filter|\/Length|\/Type|\/Font|endobj|stream|xref)/i.test(m))
              .join(" ");
          }
        }
      }
    } else if (contentType.includes("application/json")) {
      const json = await request.json();
      extractedText = json.rawText || "";
      fileName = json.fileName || fileName;
    }

    // Extract structured profile details
    const parsedData = extractFromText(extractedText, fileName);

    return NextResponse.json({
      success: true,
      fileName,
      parsed: parsedData,
      rawExtractedLength: extractedText.length,
    });
  } catch (error) {
    console.error("Resume parse API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to parse resume payload" },
      { status: 500 }
    );
  }
}
