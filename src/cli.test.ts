import { describe, test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Elindítja a CLI folyamatot, és visszaadja az exit-kódot + kimeneteket.
async function runCli(args: string[]) {
    const proc = Bun.spawn(["bun", "src/cli.ts", ...args], {
        stdout: "pipe",
        stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    const stdout = await new Response(proc.stdout).text();
    return { exitCode, stdout, stderr };
}

describe("CLI (e2e)", () => {
    test("no argument → exit 1 with usage message", async () => {
        const { exitCode, stderr } = await runCli([]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Használat");
    });

    test("nonexistent file → exit 1 with not-found message", async () => {
        const { exitCode, stderr } = await runCli(["content/__no_such_file__.mdx"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("nem található");
    });

    test("empty file → exit 1 with empty message", async () => {
        const tmp = "content/__e2e_empty__.mdx";
        writeFileSync(tmp, "");
        try {
            const { exitCode, stderr } = await runCli([tmp]);
            expect(exitCode).toBe(1);
            expect(stderr).toContain("üres");
        } finally {
            unlinkSync(tmp); // takarítás, akár bukik a teszt, akár nem
        }
    });

    test("missing API key → exit 1 with key message", async () => {
        // ideiglenes mappa, benne egy valódi (nem üres) cikk, DE nincs .env
        const dir = mkdtempSync(join(tmpdir(), "lektor-"));
        const file = join(dir, "article.mdx");
        writeFileSync(file, "Some real prose here.");
        const cliPath = join(process.cwd(), "src", "cli.ts");

        try {
            const proc = Bun.spawn(["bun", cliPath, file], {
                cwd: dir,                                   // nincs .env → Bun nem tölt kulcsot
                env: { ...process.env, GEMINI_API_KEY: "" }, // a kulcsot üresre kényszerítjük
                stdout: "pipe",
                stderr: "pipe",
            });
            const exitCode = await proc.exited;
            const stderr = await new Response(proc.stderr).text();

            expect(exitCode).toBe(1);
            expect(stderr).toContain("GEMINI_API_KEY");
        } finally {
            rmSync(dir, { recursive: true, force: true }); // takarítás
        }
    });
});