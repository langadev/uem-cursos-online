import axios from "axios";
import { spawn } from "child_process";
import { Request, Response, Router } from "express";
import fs from "fs";
import os from "os";
import path from "path";

const router = Router();

// Allowed hosts for proxying
const ALLOWED_HOSTS = [
  "supabase.co",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

// Helper: check allowed host
const isAllowedHost = (hostname: string) =>
  ALLOWED_HOSTS.some((a) => hostname.includes(a));

// Convert buffer to PDF using soffice (LibreOffice headless)
const convertToPdfViaSoffice = (
  input: Buffer,
  inputExt: string,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const inputFile = path.join(
      tmpDir,
      `pdf_conv_${timestamp}_input${inputExt}`,
    );
    const outputDir = tmpDir;

    fs.writeFileSync(inputFile, input);
    console.log(
      `[PDF Conversion] Input file: ${inputFile}, size: ${input.length}`,
    );

    const proc = spawn(
      "soffice",
      ["--headless", "--convert-to", "pdf", "--outdir", outputDir, inputFile],
      { timeout: 60000 },
    );

    let errOutput = "";

    proc.stderr.on("data", (data) => {
      errOutput += data.toString();
    });

    proc.on("close", (code) => {
      try {
        if (code !== 0) {
          console.error(
            `[PDF Conversion] soffice error (code ${code}):`,
            errOutput,
          );
          throw new Error(`soffice exit code ${code}`);
        }

        // soffice outputs PDF with the same base name as input
        const baseName = path.basename(inputFile, path.extname(inputFile));
        const outputFile = path.join(outputDir, `${baseName}.pdf`);

        console.log(`[PDF Conversion] Looking for output at: ${outputFile}`);

        if (!fs.existsSync(outputFile)) {
          throw new Error(`PDF output not found at ${outputFile}`);
        }

        const pdfBuf = fs.readFileSync(outputFile);
        console.log(`[PDF Conversion] Success! Output size: ${pdfBuf.length}`);

        // Clean up
        try {
          fs.unlinkSync(inputFile);
        } catch {}
        try {
          fs.unlinkSync(outputFile);
        } catch {}

        resolve(pdfBuf);
      } catch (e: any) {
        console.error("[PDF Conversion] Error:", e.message);
        try {
          fs.unlinkSync(inputFile);
        } catch {}
        reject(e);
      }
    });

    proc.on("error", (err: any) => {
      console.error("[PDF Conversion] Process error:", err.message);
      try {
        fs.unlinkSync(inputFile);
      } catch {}
      reject(err);
    });
  });

// Proxy endpoint: supports optional `format=pdf` to request conversion for Office docs
router.get("/proxy", async (req: Request, res: Response) => {
  const { url, format } = req.query as { url?: string; format?: string };
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const u = new URL(url);
    const host = u.hostname;
    if (!isAllowedHost(host))
      return res.status(403).json({ error: "Host not allowed" });

    const ext = (u.pathname.split(".").pop() || "").toLowerCase();
    const officeExts = ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt"];

    // If user requested PDF conversion or the file is an office doc, attempt conversion
    if (format === "pdf" || officeExts.includes(ext)) {
      try {
        console.log(
          `[Proxy] Fetching file for conversion: ${url.substring(0, 100)}...`,
        );
        const resp = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 30000,
        });
        const inputBuf = Buffer.from(resp.data);
        console.log(
          `[Proxy] Downloaded ${inputBuf.length} bytes, converting to PDF...`,
        );

        const pdfBuf = await convertToPdfViaSoffice(inputBuf, `.${ext}`);
        res.setHeader("content-type", "application/pdf");
        res.setHeader("cache-control", "public, max-age=3600");
        return res.send(pdfBuf);
      } catch (convErr: any) {
        console.error(
          "[Proxy] Conversion failed:",
          convErr?.message || convErr,
        );
        // Fall through to streaming original if conversion fails
      }
    }

    // Default: stream original file
    console.log(`[Proxy] Streaming original file: ${url.substring(0, 100)}...`);
    const response = await axios.get(url, {
      responseType: "stream",
      timeout: 30000,
    });
    res.setHeader(
      "content-type",
      response.headers["content-type"] || "application/octet-stream",
    );
    res.setHeader("cache-control", "public, max-age=3600");
    response.data.pipe(res);
  } catch (err: any) {
    console.error("[Proxy] Error:", err?.message || err);
    res
      .status(500)
      .json({
        statusCode: 500,
        error: "Error",
        message: err?.message || "Failed to fetch file",
      });
  }
});

export default router;
