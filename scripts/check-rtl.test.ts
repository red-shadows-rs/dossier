import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(new URL("./check-rtl.sh", import.meta.url));

function runCheck(srcDir: string): void {
  execFileSync("bash", [scriptPath, srcDir], { stdio: "pipe" });
}

const createdDirs: string[] = [];

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "dossier-rtl-check-"));
  createdDirs.push(root);
  const src = join(root, "src");
  mkdirSync(src, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(src, name), content);
  }
  return root;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("scripts/check-rtl.sh", () => {
  it("exits 0 on a tree with only logical utilities", () => {
    const root = makeFixture({
      "ok.tsx":
        'export default function Ok() { return <div className="ms-2 me-4 ps-1 pe-3 text-start gap-2" />; }\n',
    });
    expect(() => runCheck(join(root, "src"))).not.toThrow();
  });

  it("exits 0 for legitimate classes that merely contain a banned prefix", () => {
    const root = makeFixture({
      "ok.tsx":
        'export default function Ok() { return <div className="rounded-lg rounded-md rounded-full border-red-500 border-border bg-surface" />; }\n',
    });
    expect(() => runCheck(join(root, "src"))).not.toThrow();
  });

  it("exits 1 for margin/padding physical utilities", () => {
    for (const cls of ["ml-2", "mr-4", "pl-1", "pr-3"]) {
      const root = makeFixture({
        "bad.tsx": `export default function Bad() { return <div className="${cls}" />; }\n`,
      });
      expect(() => runCheck(join(root, "src"))).toThrow();
    }
  });

  it("exits 1 for left-*/right-* utilities", () => {
    for (const cls of ["left-2", "right-4", "left-[5px]"]) {
      const root = makeFixture({
        "bad.tsx": `export default function Bad() { return <div className="${cls}" />; }\n`,
      });
      expect(() => runCheck(join(root, "src"))).toThrow();
    }
  });

  it("exits 1 for compound physical utilities", () => {
    for (const cls of [
      "text-left",
      "text-right",
      "border-l",
      "border-l-2",
      "border-r",
      "rounded-l",
      "rounded-r-lg",
      "space-x-4",
    ]) {
      const root = makeFixture({
        "bad.tsx": `export default function Bad() { return <div className="${cls}" />; }\n`,
      });
      expect(() => runCheck(join(root, "src"))).toThrow();
    }
  });

  it("scans only tsx files under the target", () => {
    const root = makeFixture({
      "ok.tsx":
        'export default function Ok() { return <div className="ms-2" />; }\n',
      "not-checked.ts": "const pdfHtml = '<div class=\"ml-2\"></div>';\n",
    });
    expect(() => runCheck(join(root, "src"))).not.toThrow();
  });

  it("fails when the target directory is missing", () => {
    const root = makeFixture({});
    expect(() => runCheck(join(root, "does-not-exist"))).toThrow();
  });
});
