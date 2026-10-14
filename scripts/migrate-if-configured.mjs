// Aplica las migraciones de la base de datos durante la compilación en Vercel,
// solo si hay una base configurada. Sin DATABASE_URL (por ejemplo en una vista previa
// o en tu computador) se salta en silencio, así la compilación nunca se rompe por esto.
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("Migraciones: no hay DATABASE_URL, se omiten.");
  process.exit(0);
}

execSync("npx prisma migrate deploy", { stdio: "inherit" });
