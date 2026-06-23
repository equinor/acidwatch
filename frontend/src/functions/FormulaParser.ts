const ATOM_PATTERN: string = [
    "(A[cglmrstu]",
    "|B[aehikr]?",
    "|C[adeflmnorsu]?",
    "|D[bsy]",
    "|E[rsu]",
    "|F[elmr]?",
    "|G[ade]",
    "|H[efgos]?",
    "|I[nr]?",
    "|Kr?",
    "|L[airuv]",
    "|M[cdgnot]",
    "|N[abdehiop]?",
    "|O[gs]?",
    "|P[abdmortu]?",
    "|R[abefghnu]",
    "|S[bcegimnr]?",
    "|T[abcehilms]",
    "|U",
    "|V",
    "|W",
    "|Xe",
    "|Yb?",
    "|Z[nr])(\\d*)",
].join("");

const TOKENS: [string, string][] = [
    ["ATOM", ATOM_PATTERN],
    ["OPEN", "\\("],
    ["CLOSE", "\\)(\\d*)"],
    ["INVALID", "."],
];

const SUBSTANCE_PATTERN = new RegExp(TOKENS.map(([name, pattern]) => `(?<${name}>${pattern})`).join("|"), "g");

/// Clone of the Python `lastgroup` function of `re.Match` objects.
/// Returns the name of the first group that matched.
function lastGroup(match: RegExpMatchArray): string {
    return Object.entries(match.groups!)
        .map(([k, v]) => (v ? k : undefined))
        .filter((k) => k)[0]!;
}

export function parseFormula(formula: string): Record<string, number> {
    const stack: Record<string, number>[] = [{}];

    for (const match of formula.matchAll(SUBSTANCE_PATTERN)) {
        const kind = lastGroup(match);
        const current = stack.at(-1)!;

        switch (kind) {
            case "ATOM": {
                const name = match.at(2)!;
                const count = parseInt(match.at(3) || "1");
                current[name] = (current[name] ?? 0) + count;
                break;
            }

            case "OPEN":
                stack.push({});
                break;

            case "CLOSE": {
                const prev = stack.at(-2)!;
                const mult = parseInt(match.at(6) || "1");
                for (const [name, num] of Object.entries(stack.pop()!)) {
                    prev[name] = (prev[name] ?? 0) + num * mult;
                }
                break;
            }

            default:
                throw new Error(`Unexpected '${match}'`);
        }
    }

    if (stack.length != 1) {
        throw new Error(`Couldn't parse substance: ${formula}`);
    }

    return stack[0];
}
