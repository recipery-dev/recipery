import { NextResponse } from "next/server";
import { Zip, type FlateError } from "fflate";
import { getActiveProfile } from "@/lib/profiles/store";
import { getStorage } from "@/lib/storage";
import { writeExportEntries } from "@/lib/export";
import { DEMO_MODE } from "@/lib/demo-mode";

// GET is a safe method, so middleware.ts's demo-mode gate (which only blocks
// mutating requests) doesn't cover it — this route needs its own check.
export async function GET() {
  const active = await getActiveProfile();
  if (active.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can export data" }, { status: 403 });
  }
  if (DEMO_MODE) {
    return NextResponse.json({ error: "Export is disabled in the demo" }, { status: 403 });
  }

  const storage = getStorage();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const zip = new Zip((err: FlateError | null, chunk: Uint8Array, final: boolean) => {
        if (err) {
          controller.error(err);
          return;
        }
        if (chunk.length > 0) controller.enqueue(chunk);
        if (final) controller.close();
      });

      writeExportEntries(zip, storage)
        .then(() => zip.end())
        .catch((err) => controller.error(err));
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="recipery-backup-${date}.zip"`,
    },
  });
}
