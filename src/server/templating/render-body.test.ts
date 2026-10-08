import { describe, expect, it, vi } from "vitest";
import {
  extractVariables,
  findMisplacedBlocks,
  numberedParagraphLabels,
  parseBody,
  renderInline,
  specialBlockSequence,
  type Block,
  type SpecialBlockName,
} from "./render-body";

const VECTOR =
  "First.\n\nSecond line A\nsecond line B\n\n- a\n- b\n\n> note\n\n{{block.signatures}}";

describe("parseBody", () => {
  it("parses the 16.1 vector", () => {
    expect(parseBody(VECTOR)).toEqual<Block[]>([
      { type: "paragraph", numbered: true, text: "First." },
      {
        type: "paragraph",
        numbered: true,
        text: "Second line A\nsecond line B",
      },
      { type: "bullets", items: ["a", "b"] },
      { type: "paragraph", numbered: false, text: "note" },
      { type: "special", name: "signatures" },
    ]);
  });

  it("normalizes CRLF and collapses 3+ newlines", () => {
    expect(parseBody("A\r\n\r\n\r\nB")).toEqual<Block[]>([
      { type: "paragraph", numbered: true, text: "A" },
      { type: "paragraph", numbered: true, text: "B" },
    ]);
  });

  it("recognizes every special block with optional whitespace", () => {
    for (const name of [
      "parties",
      "pricing_table",
      "payment_schedule",
      "signatures",
    ] as SpecialBlockName[]) {
      expect(parseBody(`{{ block.${name} }}`)).toEqual<Block[]>([
        { type: "special", name },
      ]);
    }
  });

  it("treats a block token in a sentence as a normal paragraph", () => {
    const blocks = parseBody("See {{block.signatures}} below.");
    expect(blocks).toEqual<Block[]>([
      {
        type: "paragraph",
        numbered: true,
        text: "See {{block.signatures}} below.",
      },
    ]);
  });

  it("labels numbered paragraphs as N.k", () => {
    expect(numberedParagraphLabels(5, parseBody(VECTOR))).toEqual([
      "5.1",
      "5.2",
    ]);
  });
});

describe("extractVariables", () => {
  it("returns unique names in order of appearance and ignores blocks", () => {
    expect(
      extractVariables(
        "{{project.name}} {{contract.total}} {{ project.name }} {{block.signatures}}",
      ),
    ).toEqual(["project.name", "contract.total"]);
  });
});

describe("block placement validators", () => {
  it("finds misplaced block tokens", () => {
    expect(findMisplacedBlocks("This is {{block.signatures}} inside.")).toEqual(
      ["signatures"],
    );
    expect(findMisplacedBlocks("{{block.parties}}")).toEqual([]);
    expect(findMisplacedBlocks("{{ block.pricing_table }}")).toEqual([]);
  });

  it("returns the ordered special-block sequence", () => {
    expect(specialBlockSequence(VECTOR)).toEqual(["signatures"]);
    expect(
      specialBlockSequence("{{block.parties}}\n\nx\n\n{{block.signatures}}"),
    ).toEqual(["parties", "signatures"]);
  });
});

describe("renderInline", () => {
  it("escapes a hostile variable value inside <bdi>", () => {
    const out = renderInline(
      "{{client.name}}",
      { "client.name": "<img src=x onerror=alert(1)>" },
      () => {},
    );
    expect(out).toContain("<bdi>");
    expect(out).toContain("&lt;img");
    expect(out).not.toContain("<img");
  });

  it("converts **bold** in literal text", () => {
    expect(renderInline("a **bold** b", {}, () => {})).toBe(
      "a <strong>bold</strong> b",
    );
  });

  it("bolds a variable wrapped in ** markers", () => {
    expect(renderInline("**{{x}}**", { x: "Y" }, () => {})).toBe(
      "<strong><bdi>Y</bdi></strong>",
    );
  });

  it("does not convert ** inside a substituted value", () => {
    expect(renderInline("{{x}}", { x: "a **b** c" }, () => {})).toBe(
      "<bdi>a **b** c</bdi>",
    );
  });

  it("does not expand {{...}} inside a substituted value", () => {
    const out = renderInline(
      "{{contract.scope}}",
      { "contract.scope": "see {{client.name}}", "client.name": "SECRET" },
      () => {},
    );
    expect(out).toContain("{{client.name}}");
    expect(out).not.toContain("SECRET");
  });

  it("ignores whitespace inside braces", () => {
    expect(renderInline("{{  x  }}", { x: "Y" }, () => {})).toBe(
      "<bdi>Y</bdi>",
    );
  });

  it("reports and marks a missing variable", () => {
    const onMissing = vi.fn();
    const out = renderInline("{{contract.scope}}", {}, onMissing);
    expect(onMissing).toHaveBeenCalledWith("contract.scope");
    expect(out).toContain("⟦missing: contract.scope⟧");
  });

  it("converts newlines to <br> in literal text and values", () => {
    expect(renderInline("a\nb", {}, () => {})).toBe("a<br>b");
    expect(renderInline("{{x}}", { x: "a\nb" }, () => {})).toBe(
      "<bdi>a<br>b</bdi>",
    );
  });
});
