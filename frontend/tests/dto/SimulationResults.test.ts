import { describe, it, expect } from "vitest";
import { Panel } from "@/dto/SimulationResults";

describe("Panel schema", () => {
    it("accepts a group of panels", () => {
        const panel = Panel.parse({
            type: "group",
            label: "Results",
            panels: [
                { type: "text", label: null, data: "hello" },
                { type: "json", label: null, data: { a: 1 } },
            ],
        });
        expect(panel.type === "group" && panel.panels).toHaveLength(2);
    });

    it("rejects a group nested in a group", () => {
        const nested = { type: "group", label: null, panels: [{ type: "group", label: null, panels: [] }] };
        expect(() => Panel.parse(nested)).toThrow();
    });
});
