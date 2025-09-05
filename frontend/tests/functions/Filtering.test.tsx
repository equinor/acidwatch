import { describe, expect, it } from "vitest";
import { filterValidModels, filterGraphDataByComponents } from "../../src/functions/Filtering";
import { ExperimentResult } from "../../src/dto/ExperimentResult";
import { ModelConfig } from "../../src/dto/FormConfig";
import { ScatterGraphData } from "../../src/dto/ScatterGraphInput";

describe("Filtering Functions", () => {
    describe("filterValidModels", () => {
        const mockModels: ModelConfig[] = [
            {
                modelId: "model1",
                displayName: "Primary CO Model",
                validSubstances: ["CO", "H2O"],
                parameters: {},
                description: "Test model",
                category: "Primary",
            },
            {
                modelId: "model2",
                displayName: "Primary Multi-Component Model",
                validSubstances: ["COS", "H2O", "CH4", "N2"],
                parameters: {},
                description: "Test model",
                category: "Primary",
            },
            {
                modelId: "model3",
                displayName: "Secondary Model",
                validSubstances: ["CO", "H2O"],
                parameters: {},
                description: "Test model",
                category: "Secondary",
            },
            {
                modelId: "model4",
                displayName: "Only COS Primary Model",
                validSubstances: ["COS", "H2O"],
                parameters: {},
                description: "Test model",
                category: "Primary",
            },
            {
                modelId: "model5",
                displayName: "Only Oxygen and Nitrogen Primary Model",
                validSubstances: ["O2", "N2", "H2O"],
                parameters: {},
                description: "Test model",
                category: "Primary",
            },
        ];

        const mockExperiment: ExperimentResult[] = [
            {
                name: "Test Experiment 1 (Can call all primary models)",
                time: 100,
                temperature: 25,
                pressure: 1,
                initialConcentrations: { H2O: 0.3 },
                finalConcentrations: { CO: 0.4, H2O: 0.4 },
            },
            {
                name: "Test Experiment 2 (Can only call model2 and model4)",
                time: 200,
                temperature: 30,
                pressure: 150,
                initialConcentrations: { H2O: 0.2, COS: 0.5 },
                finalConcentrations: { CO: 0.5, H2O: 0.3 },
            },
            {
                name: "Test Experiment 3 (Can only call model2 and model4 and disregards concetrations equal to zero)",
                time: 200,
                temperature: 30,
                pressure: 150,
                initialConcentrations: { H2O: 0.2, COS: 0.5, CH4: 0, N2: 0, O2: 0 },
                finalConcentrations: { CO: 0.5, H2O: 0.3 },
            },
            {
                name: "Test Experiment 4 (Only zero concerations, hotdog finger)",
                time: 200,
                temperature: 30,
                pressure: 150,
                initialConcentrations: { H2O: 0, COS: 0, CH4: 0, N2: 0, O2: 0 },
                finalConcentrations: { CO: 0.5, H2O: 0.3 },
            },
        ];

        it("filters models by Primary category", () => {
            const result = filterValidModels(mockExperiment[0], mockModels);
            console.log(result);
            expect(result.every((model) => model.category === "Primary")).toBe(true);
        });

        it("filters models by valid substances", () => {
            const result = filterValidModels(mockExperiment[1], mockModels);

            const modelIds = result.map((model) => model.modelId);
            expect(modelIds).toContain("model4"); // supports CO2 and H2O
            expect(modelIds).toContain("model2"); // supports CO2, CH4 and H2O
            expect(modelIds).not.toContain("model1");
            expect(modelIds).not.toContain("model3");
            expect(modelIds).not.toContain("model5");
        });

        it("excludes zero concentrations from filtering", () => {
            const result = filterValidModels(mockExperiment[2], mockModels);
            const modelIds = result.map((model) => model.modelId);
            expect(modelIds).toContain("model4"); // supports CO2 and H2O
            expect(modelIds).toContain("model2"); // supports CO2, CH4 and H2O
            expect(modelIds).not.toContain("model1");
            expect(modelIds).not.toContain("model3");
            expect(modelIds).not.toContain("model5");
        });

        it("handles experiment with all zero concentrations", () => {
            const result = filterValidModels(mockExperiment[3], mockModels);

            expect(result.every((model) => model.category === "Primary")).toBe(true);
        });
    });

    describe("filterGraphDataByComponents", () => {
        const mockGraphData: ScatterGraphData[] = [
            {
                x: "CO2",
                y: 0.4,
                label: "Experiment 1",
            },
            {
                x: "H2O",
                y: 0.3,
                label: "Experiment 1",
            },
            {
                x: "CH4",
                y: 0.2,
                label: "Experiment 1",
            },
            {
                x: "CO2",
                y: 0.5,
                label: "Experiment 2",
            },
            {
                x: "H2O",
                y: 0.4,
                label: "Experiment 2",
            },
        ];

        it("returns empty array when no components are selected", () => {
            const result = filterGraphDataByComponents(mockGraphData, []);
            expect(result).toHaveLength(0);
        });

        it("filters data for single selected component", () => {
            const result = filterGraphDataByComponents(mockGraphData, ["CO2"]);

            expect(result.every((data) => data.x === "CO2")).toBe(true);
        });

        it("filters data for multiple selected components", () => {
            const result = filterGraphDataByComponents(mockGraphData, ["CO2", "H2O"]);

            expect(result.every((data) => ["CO2", "H2O"].includes(data.x as string))).toBe(true);
        });

        it("handles non-existent component selection", () => {
            const result = filterGraphDataByComponents(mockGraphData, ["N2"]);
            expect(result).toHaveLength(0);
        });

        it("handles mix of existing and non-existing components", () => {
            const result = filterGraphDataByComponents(mockGraphData, ["CO2", "N2", "O2"]);
            expect(result).not.toHaveLength(0);
            expect(result.every((data) => data.x === "CO2")).toBe(true);
        });

        it("handles empty graph data array", () => {
            const result = filterGraphDataByComponents([], ["CO2", "H2O"]);
            expect(result).toHaveLength(0);
        });
    });
});
