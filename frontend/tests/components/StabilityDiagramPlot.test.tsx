import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StabilityDiagramPlot from "@/components/Simulation/StabilityDiagramPlot";
import { buildStabilityDiagramOption } from "@/components/Simulation/stabilityDiagramOption";
import { Panel, StabilityDiagramPanel } from "@/dto/SimulationResults";

vi.mock("@/components/Charts/EChart", () => ({
    default: () => <div data-testid="echart" />,
}));

const diagram: StabilityDiagramPanel = {
    type: "stability_diagram",
    label: "N map",
    x_label: "lg H2O",
    y_label: "lg O2",
    regions: [
        {
            name: "Fe",
            points: [
                [-20, -120],
                [2, -120],
                [2, -80],
                [-20, -80],
            ],
            centroid: [-9, -100],
        },
        {
            name: "FeCO3",
            points: [
                [-20, -80],
                [2, -80],
                [2, 2],
                [-20, 2],
            ],
            centroid: [-9, -40],
        },
    ],
};

describe("StabilityDiagramPlot", () => {
    it("renders a chart", () => {
        render(<StabilityDiagramPlot diagram={diagram} />);

        expect(screen.getAllByTestId("echart")).toHaveLength(1);
    });

    it("builds an option with axes spanning the regions and one item per region", () => {
        const option = buildStabilityDiagramOption(diagram) as any;

        expect(option.title).toMatchObject({ text: "N map" });
        expect(option.xAxis).toMatchObject({ name: "lg H2O", min: -20, max: 2 });
        expect(option.yAxis).toMatchObject({ name: "lg O2", min: -120, max: 2 });
        expect(option.series[0].data.map((item: { name: string }) => item.name)).toEqual(["Fe", "FeCO3"]);
    });
});

describe("Panel schema", () => {
    it("accepts a stability diagram", () => {
        expect(Panel.parse(diagram).type).toBe("stability_diagram");
    });
});
