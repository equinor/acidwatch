import React, { useMemo, useState } from "react";
import { Autocomplete, Typography } from "@equinor/eds-core-react";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { Phase } from "@/dto/SimulationResults";
import LineChart, { LineSeries } from "@/components/Charts/LineChart";
import SeriesTable, { SeriesGroup } from "@/components/Tables/SeriesTable";
import { optionName } from "@/functions/Substance";
import { gridModelLabel, phaseUnit } from "@/utils/modelUtils";
import PhaseSections from "@/components/PhaseSections";
import {
    collectOutputSubstances,
    defaultSelectedSubstances,
    maxOutput,
    pointOutput,
    visiblePhaseKinds,
} from "@/utils/simulationOutputs";

interface PhaseSeriesViewProps {
    results: GridSimulationResult[];
    modelIndex: number;
    phaseKind: Phase["kind"];
}

const PhaseSeriesView: React.FC<PhaseSeriesViewProps> = ({ results, modelIndex, phaseKind }) => {
    const allSimulations = useMemo(() => results.flatMap((r) => r.simulations), [results]);
    const allSubstances = useMemo(
        () =>
            collectOutputSubstances(allSimulations, modelIndex, phaseKind).filter(
                (substance) => maxOutput(allSimulations, substance, modelIndex, phaseKind) > 0
            ),
        [allSimulations, modelIndex, phaseKind]
    );
    const [selection, setSelection] = useState<string[] | null>(null);
    const selectedSubstances = selection ?? defaultSelectedSubstances(allSimulations, modelIndex, phaseKind);

    const xAxisSubstance = results[0]?.axes[0]?.substance ?? "";
    const xValues = Array.from(
        new Set(allSimulations.map((sim) => sim.input.concentrations[xAxisSubstance] ?? 0))
    ).sort((a, b) => a - b);

    const axisSubstances = new Set(results.map((r) => r.axes[0]?.substance).filter(Boolean));
    const xAxisLabel =
        axisSubstances.size === 1 ? `${[...axisSubstances][0]} (ppm·mol)` : "Varied concentration (ppm·mol)";

    const groups: SeriesGroup[] = results.map((result) => {
        const valueToSim = new Map(
            result.simulations.map((sim) => [sim.input.concentrations[xAxisSubstance] ?? 0, sim])
        );
        const groupSeries: LineSeries[] = selectedSubstances.map((substance) => ({
            label: optionName(substance),
            data: xValues.map((x) => {
                const sim = valueToSim.get(x);
                return sim ? pointOutput(sim, substance, modelIndex, phaseKind) : null;
            }),
        }));
        return { label: results.length > 1 ? gridModelLabel(result) : undefined, series: groupSeries };
    });
    const series: LineSeries[] = groups.flatMap((group) =>
        group.series.map((s) => ({ ...s, label: group.label ? `${s.label} · ${group.label}` : s.label }))
    );

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

            <SeriesTable xValues={xValues} groups={groups} xLabel={`Input: ${xAxisLabel}`} />
        </>
    );
};

export default PhaseSeriesView;

interface ModelSeriesSectionProps {
    results: GridSimulationResult[];
    modelIndex: number;
}

export const ModelSeriesSection: React.FC<ModelSeriesSectionProps> = ({ results, modelIndex }) => (
    <PhaseSections
        phaseKinds={visiblePhaseKinds(
            results.flatMap((r) => r.simulations),
            modelIndex
        )}
        renderPhase={(phaseKind) => <PhaseSeriesView results={results} modelIndex={modelIndex} phaseKind={phaseKind} />}
    />
);
