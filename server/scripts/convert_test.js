const axios = require("axios");
const fs = require("fs");
const path = require("path");
const libre = require("libreoffice-convert");

(async () => {
  try {
    const url =
      "https://lopqvgqmtsmnybznvhrz.supabase.co/storage/v1/object/sign/course-files/courses/1jBPY1TQW3aTlRCh8I4W/lessons/enk5o1ztx/1771334789650_1771148289588_GCC%20plano%20(1).docx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jOWQ4ZDRmZC00NzJhLTQ2OTAtODVjZC1jOTQwNTZkYzM0YzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjb3Vyc2UtZmlsZXMvY291cnNlcy8xakJQWTFUUVczYVRsUkNoOEk0Vy9sZXNzb25zL2VuazVvMXp0eC8xNzcxMzM0Nzg5NjUwXzE3NzExNDgyODk1ODhfR0NDIHBsYW5vICgxKS5kb2N4IiwiaWF0IjoxNzcxMzM0NzkxLCJleHAiOjE4MDI4NzA3OTF9.532DHl1UHy4BeI5nu-emDC6pODtthAKbOAqCnrVXJdg";
    console.log("Downloading...", url);
    const resp = await axios.get(url, { responseType: "arraybuffer" });
    const input = Buffer.from(resp.data);
    const inPath = "/tmp/test_input.docx";
    fs.writeFileSync(inPath, input);
    console.log("Saved input to", inPath, "size", input.length);

    console.log("Converting with libreoffice-convert...");
    libre.convert(input, ".pdf", undefined, (err, done) => {
      if (err) {
        console.error("Conversion error:", err);
        process.exit(2);
      }
      const outPath = "/tmp/test_output.pdf";
      fs.writeFileSync(outPath, done);
      console.log("Wrote output PDF to", outPath, "size", done.length);
      process.exit(0);
    });
  } catch (e) {
    console.error("Test failed", e.message || e);
    process.exit(1);
  }
})();
