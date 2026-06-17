import React, { useState } from "react";
import { Button, NativeSelect, Typography } from "@equinor/eds-core-react";
import ScatterPlot, { ScatterDataSet } from "@/components/ScatterPlot";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { SimulationResults, getCo2RichConcentrations } from "@/dto/SimulationResults";

const buildParityDatasets = (
    experiments: ExperimentResult[],
    simulationsPerExperiment: Record<string, SimulationResults[]>,
    component: string
): ScatterDataSet[] => {
    const byModel: Record<string, { x: number; y: number }[]> = {};
    experiments.forEach((exp) => {
        const measured = exp.finalConcentrations[component];
        if (measured === undefined) return;
        const simulations = simulationsPerExperiment[exp.name] ?? [];
        simulations.forEach((sim) => {
            const modelId = sim.input.models[0].modelId;
            const modelled = getCo2RichConcentrations(sim.results[0]?.phases)[component] ?? 0;
            (byModel[modelId] ??= []).push({ x: measured, y: modelled });
        });
    });
    return Object.entries(byModel).map(([modelId, data]) => ({ label: modelId, data }));
};

interface ParityPlotsProps {
    availableComponents: string[];
    experiments: ExperimentResult[];
    simulationsPerExperiment: Record<string, SimulationResults[]>;
}

const ParityPlots: React.FC<ParityPlotsProps> = ({ availableComponents, experiments, simulationsPerExperiment }) => {
    const [components, setComponents] = useState<string[]>([]);

    if (availableComponents.length === 0) return null;

    return (
        <div style={{ margin: "1rem 0" }}>
            <Typography variant="h4">Parity plots</Typography>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                {components.map((comp, idx) => (
                    <div key={idx} style={{ flex: "1 1 calc(50% - 0.5rem)", minWidth: "300px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <NativeSelect
                                id={`parity-component-${idx}`}
                                label="Component"
                                value={comp}
                                onChange={(e) =>
                                    setComponents((prev) => prev.map((c, i) => (i === idx ? e.target.value : c)))
                                }
                            >
                                <option value="">Select component…</option>
                                {availableComponents.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </NativeSelect>
                            <Button
                                variant="ghost_icon"
                                onClick={() => setComponents((prev) => prev.filter((_, i) => i !== idx))}
                            >
                                ✕
                            </Button>
                        </div>
                        {comp && (
                            <ScatterPlot
                                datasets={buildParityDatasets(experiments, simulationsPerExperiment, comp)}
                                xLabel={`Measured ${comp} (ppm)`}
                                yLabel={`Modelled ${comp} (ppm)`}
                                showDiagonal
                            />
                        )}
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button variant="outlined" onClick={() => setComponents((prev) => [...prev, ""])}>
                    +
                </Button>
                <Button variant="outlined" onClick={() => setComponents(availableComponents)}>
                    One per component
                </Button>
            </div>
        </div>
    );
};

export default ParityPlots;
