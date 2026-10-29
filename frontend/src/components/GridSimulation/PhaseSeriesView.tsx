import React, { useState } from "react";
import { Autocomplete, Typography } from "@equinor/eds-core-react";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { Phase } from "@/dto/SimulationResults";
import LineChart, { LineSeries } from "@/components/Charts/LineChart";
import GenericTable from "@/components/Tables/GenericTable";
import { formatConcentration } from "@/functions/Formatting";
import { optionName } from "@/functions/Substance";
import { gridModelLabel, phaseUnit } from "@/utils/modelUtils";
import PhaseSections from "@/components/PhaseSections";
import {
    PhaseOutput,
    collectOutputSubstances,
    defaultSelectedSubstances,
    phaseOutput,
    getResultPhases,
    visiblePhaseKinds,
} from "@/utils/simulationOutputs";

interface GridPhaseRuns {
    label: string;
    axisSubstance: string;
    runs: { x: number; output: PhaseOutput | null }[];
}

const toGridPhaseRuns = (
    result: GridSimulationResult,
    resultIndex: number,
    phaseKind: Phase["kind"]
): GridPhaseRuns => {
    const axisSubstance = result.axes[0]?.substance ?? "";
    return {
        label: gridModelLabel(result),
        axisSubstance,
        runs: result.simulations.map((sim) => ({
            x: sim.input.concentrations[axisSubstance] ?? 0,
            output: phaseOutput(sim, resultIndex, phaseKind),
        })),
    };
};

interface PhaseSeriesViewProps {
    grids: GridPhaseRuns[];
    phaseKind: Phase["kind"];
}

const PhaseSeriesView: React.FC<PhaseSeriesViewProps> = ({ grids, phaseKind }) => {
    const outputs = grids.flatMap((grid) => grid.runs.flatMap((run) => (run.output ? [run.output] : [])));
    const allSubstances = collectOutputSubstances(outputs);
    const [selection, setSelection] = useState<string[] | null>(null);
    const selectedSubstances = selection ?? defaultSelectedSubstances(outputs);

    const xValues = Array.from(new Set(grids.flatMap((grid) => grid.runs.map((run) => run.x)))).sort((a, b) => a - b);

    const axisSubstances = new Set(grids.map((grid) => grid.axisSubstance).filter(Boolean));
    const xAxisLabel =
        axisSubstances.size === 1 ? `${[...axisSubstances][0]} (ppm·mol)` : "Varied concentration (ppm·mol)";

    const series: LineSeries[] = grids.flatMap((grid) => {
        const xToOutput = new Map(grid.runs.map((run) => [run.x, run.output]));
        return selectedSubstances.map((substance) => ({
            label: grids.length === 1 ? optionName(substance) : `${optionName(substance)} · ${grid.label}`,
            data: xValues.map((x) => {
                const output = xToOutput.get(x);
                return output ? (output[substance] ?? 0) : null;
            }),
        }));
    });

    return (
        <>
            <Autocomplete
                label="Output substances"
                options={allSubstances}
                selectedOptions={selectedSubstances}
                multiple
                onOptionsChange={({ selectedItems }) => setSelection(selectedItems)}
                optionLabel={optionName}
                style={{ maxWidth: "400px", marginBottom: "1rem" }}
            />

            {series.length === 0 ? (
                <Typography variant="body_short" italic>
                    Select at least one output substance to chart.
                </Typography>
            ) : (
                <LineChart
                    xValues={xValues}
                    series={series}
                    xAxisLabel={xAxisLabel}
                    yAxisLabel={`Output concentration (${phaseUnit(phaseKind)})`}
                    aspectRatio={2}
                />
            )}

            <Typography variant="h5" style={{ margin: "1.5rem 0 1rem" }}>
                Values
            </Typography>

            <GenericTable
                data={xValues.map((x, index) => ({
                    [`Input: ${xAxisLabel}`]: x,
                    ...Object.fromEntries(
                        series.map((s) => [s.label, s.data[index] === null ? "–" : formatConcentration(s.data[index])])
                    ),
                }))}
            />
        </>
    );
};

export default PhaseSeriesView;

interface StageSeriesSectionProps {
    runs: { result: GridSimulationResult; resultIndex: number }[];
}

export const StageSeriesSection: React.FC<StageSeriesSectionProps> = ({ runs }) => {
    return (
        <PhaseSections
            phaseKinds={visiblePhaseKinds(
                runs.flatMap(({ result, resultIndex }) =>
                    result.simulations.flatMap((sim) => getResultPhases(sim, resultIndex))
                )
            )}
            renderPhase={(phaseKind) => (
                <PhaseSeriesView
                    grids={runs.map(({ result, resultIndex }) => toGridPhaseRuns(result, resultIndex, phaseKind))}
                    phaseKind={phaseKind}
                />
            )}
        />
    );
};
