import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { errorResponse } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";

export const runtime = "nodejs";

function getPgDumpUrl() {
  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    // Keep only query params that Postgres tools understand.
    const allowed = new Set(["sslmode", "application_name", "connect_timeout"]);
    [...url.searchParams.keys()].forEach((key) => {
      if (!allowed.has(key)) url.searchParams.delete(key);
    });
    return url.toString();
  } catch {
    return raw;
  }
}

async function runPgDump(connectionString: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(
      "pg_dump",
      [
        connectionString,
        "--no-owner",
        "--no-privileges",
        "--format=plain",
        "--encoding=UTF8"
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    const out: Buffer[] = [];
    const err: Buffer[] = [];

    child.stdout.on("data", (chunk) => out.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => err.push(Buffer.from(chunk)));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(out));
      } else {
        reject(new Error(Buffer.concat(err).toString("utf8") || `pg_dump failed with code ${code}`));
      }
    });
  });
}

export async function GET() {
  try {
    await requireAdminUser();
    const url = getPgDumpUrl();
    if (!url) return errorResponse(500, "Missing DIRECT_URL/DATABASE_URL");

    const sql = await runPgDump(url);
    return new NextResponse(sql.toString("utf8"), {
      status: 200,
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="expense-tracker-pgdump-${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.sql"`
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return errorResponse(500, "pg_dump is not available in this server environment");
    }
    console.error(error);
    return errorResponse(500, "Failed to export SQL with pg_dump");
  }
}
