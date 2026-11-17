import { describe, expect, it } from "vitest";
import { suggestInstitutions } from "./institutions";

const names = (q: string, kind?: Parameters<typeof suggestInstitutions>[1]) => suggestInstitutions(q, kind).map((i) => i.name);

describe("bank suggestions", () => {
  it("shows at most three, names that start with what's typed first", () => {
    expect(names("c").length).toBe(3);
    expect(names("cha")).toEqual(["Chase", "Charles Schwab"]);
  });

  it("matches nicknames and words inside names", () => {
    expect(names("amex")).toEqual(["American Express"]);
    expect(names("bofa")).toEqual(["Bank of America"]);
    expect(names("goldman")).toContain("Marcus by Goldman Sachs");
    expect(names("fargo")).toEqual(["Wells Fargo"]);
  });

  it("favors institutions known for the kind of account", () => {
    // "S": SoFi and Schwab both start with S; for retirement, the brokerages come first.
    expect(names("s", "retirement")[0]).toMatch(/Schwab|SoFi/);
    expect(names("fi", "retirement")[0]).toBe("Fidelity");
    expect(names("m", "loan")).toContain("MOHELA");
  });

  it("ignores punctuation and case, and suggests nothing for an empty box", () => {
    expect(names("us bank")).toEqual(["U.S. Bank"]);
    expect(names("E TRADE")).toEqual(["E*TRADE"]);
    expect(names("   ")).toEqual([]);
  });
});
