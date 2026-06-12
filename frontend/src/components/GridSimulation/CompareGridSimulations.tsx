import React, { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { CircularProgress, NativeSelect, Typography } from "@equinor/eds-core-react";
import { getGridSimulationResult, ResultIsPending } from "@/api/api";
import { MainContainer } from "@/components/styles";
import { GridSimulationResult } from "@/dto/GridSimulation";
import LineChart, { LineSeries } from "@/components/LineChart";
import { collectOutputSubstances, pointOutput, significantSubstances } from "@/functions/GridSimulation";
import { optionName } from "@/functions/Substance";

interface CompareGridSimulationsProps {
    gridIds: string[];
}

const modelChainLabel = (result: GridSimulationResult): string => {
    const firstSim = result.simulations[0];
    if (!firstSim) return "Unknown model";
    return firstSim.input.models.map((m) => m.modelId).join(" → ") || "Unknown model";
};

const CompareGridSimulations: React.FC<CompareGridSimulationsProps> = ({ gridIds }) => {
    const queries = useQueries({
        queries: gridIds.map((id) => ({
            queryKey: ["grid-simulation", id],
            queryFn: () => getGridSimulationResult(id),
            retry: (_count: number, error: Error) => error instanceof ResultIsPending,
            retryDelay: () => 2000,
        })),
    });

    const isLoading = queries.some((q) => q.isLoading);
    const hasError = queries.some((q) => q.isError);
    const results = queries.map((q) => q.data).filter((data): data is GridSimulationResult => data !== undefined);

    const allSubstances = useMemo(() => {
        const substances = new Set<string>();
        results.forEach((r) => significantSubstances(r.simulations).forEach((s) => substances.add(s)));
        if (substances.size === 0) {
            results.forEach((r) => collectOutputSubstances(r.simulations).forEach((s) => substances.add(s)));
        }
        return Array.from(substances).sort();
    }, [results]);

    const [substance, setSubstance] = useState<string>("");
    const selectedSubstance = substance || allSubstances[0] || "";

    const header = (
        <Typography variant="h2" style={{ marginBottom: "2rem" }}>
            Compare Grid Simulations
        </Typography>
    );

    if (gridIds.length === 0) {
        return (
            <MainContainer>
                {header}
                <Typography variant="body_short">No grid simulations selected for comparison.</Typography>
            </MainContainer>
        );
    }
    if (isLoading) {
        return (
            <MainContainer>
                {header}
                <CircularProgress />
            </MainContainer>
        );
    }
    if (hasError) {
        return (
            <MainContainer>
                {header}
                <Typography variant="body_short" style={{ color: "red" }}>
                    Error loading grid simulation results
                </Typography>
            </MainContainer>
        );
    }

    const xAxisSubstance = results[0]?.axes[0]?.substance ?? "";
    const unifiedXValues = Array.from(
        new Set(results.flatMap((r) => r.simulations.map((sim) => sim.input.concentrations[xAxisSubstance] ?? 0)))
    ).sort((a, b) => a - b);

    const series: LineSeries[] = results.map((r) => {
        const valueToSim = new Map(r.simulations.map((sim) => [sim.input.concentrations[xAxisSubstance] ?? 0, sim]));
        return {
            label: `${modelChainLabel(r)} · ${r.axes[0]?.substance ?? ""}`,
            data: unifiedXValues.map((x) => {
                const sim = valueToSim.get(x);
                return sim ? pointOutput(sim, selectedSubstance) : null;
            }),
        };
    });

    const axisSubstances = new Set(results.map((r) => r.axes[0]?.substance).filter(Boolean));
    const xAxisLabel = axisSubstances.size === 1 ? `${[...axisSubstances][0]} (ppm)` : "Varied concentration (ppm)";

    return (
        <MainContainer>
            {header}
            <Typography variant="body_short" style={{ marginBottom: "1rem" }}>
                Comparing {results.length} grid simulations. Each line shows how the selected output substance responds
                across the configured range.
            </Typography>
            <NativeSelect
                id="compareGridSubstance"
                label="Output substance"
                value={selectedSubstance}
                onChange={(e) => setSubstance(e.target.value)}
                style={{ maxWidth: "400px", marginBottom: "1rem" }}
            >
                {allSubstances.map((s) => (
                    <option key={s} value={s}>
                        {optionName(s)}
                    </option>
                ))}
            </NativeSelect>
            {selectedSubstance === "" ? (
                <Typography variant="body_short" italic>
                    No output substances available to compare.
                </Typography>
            ) : (
                <LineChart
                    xValues={unifiedXValues}
                    series={series}
                    xAxisLabel={xAxisLabel}
                    yAxisLabel={`${selectedSubstance} (ppm)`}
                    aspectRatio={2}
                />
            )}
        </MainContainer>
    );
};

export default CompareGridSimulations;
