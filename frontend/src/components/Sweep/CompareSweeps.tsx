import React, { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { CircularProgress, NativeSelect, Typography } from "@equinor/eds-core-react";
import { getSweepResult, ResultIsPending } from "@/api/api";
import { MainContainer } from "@/components/styles";
import { SweepResults } from "@/dto/Sweep";
import LineChart, { LineSeries } from "@/components/LineChart";
import { collectOutputSubstances, pointOutput, significantSubstances } from "@/functions/Sweep";
import { optionName } from "@/functions/Substance";

interface CompareSweepsProps {
    sweepIds: string[];
}

const modelChainLabel = (sweep: SweepResults): string =>
    sweep.models.map((model) => model.modelId).join(" → ") || "Unknown model";

const CompareSweeps: React.FC<CompareSweepsProps> = ({ sweepIds }) => {
    const queries = useQueries({
        queries: sweepIds.map((id) => ({
            queryKey: ["sweep", id],
            queryFn: () => getSweepResult(id),
            retry: (_count: number, error: Error) => error instanceof ResultIsPending,
            retryDelay: () => 2000,
        })),
    });

    const isLoading = queries.some((q) => q.isLoading);
    const hasError = queries.some((q) => q.isError);
    const sweeps = queries.map((q) => q.data).filter((data): data is SweepResults => data !== undefined);

    const allSubstances = useMemo(() => {
        const substances = new Set<string>();
        sweeps.forEach((sweep) => significantSubstances(sweep.points).forEach((s) => substances.add(s)));
        if (substances.size === 0) {
            sweeps.forEach((sweep) => collectOutputSubstances(sweep.points).forEach((s) => substances.add(s)));
        }
        return Array.from(substances).sort();
    }, [sweeps]);

    const [substance, setSubstance] = useState<string>("");
    const selectedSubstance = substance || allSubstances[0] || "";

    const header = (
        <Typography variant="h2" style={{ marginBottom: "2rem" }}>
            Compare Sweeps
        </Typography>
    );

    if (sweepIds.length === 0) {
        return (
            <MainContainer>
                {header}
                <Typography variant="body_short">No sweeps selected for comparison.</Typography>
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
                    Error loading sweep results
                </Typography>
            </MainContainer>
        );
    }

    const unifiedXValues = Array.from(new Set(sweeps.flatMap((sweep) => sweep.values))).sort((a, b) => a - b);

    const series: LineSeries[] = sweeps.map((sweep) => {
        const valueToPoint = new Map(sweep.points.map((point) => [point.value, point]));
        return {
            label: `${modelChainLabel(sweep)} · ${sweep.sweptSubstance}`,
            data: unifiedXValues.map((x) => {
                const point = valueToPoint.get(x);
                return point ? pointOutput(point, selectedSubstance) : null;
            }),
        };
    });

    const sweptSubstances = new Set(sweeps.map((sweep) => sweep.sweptSubstance));
    const xAxisLabel = sweptSubstances.size === 1 ? `${[...sweptSubstances][0]} (ppm)` : "Swept concentration (ppm)";

    return (
        <MainContainer>
            {header}
            <Typography variant="body_short" style={{ marginBottom: "1rem" }}>
                Comparing {sweeps.length} sweeps. Each line shows how the selected output substance responds across the
                swept range.
            </Typography>
            <NativeSelect
                id="compareSweepSubstance"
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

export default CompareSweeps;
