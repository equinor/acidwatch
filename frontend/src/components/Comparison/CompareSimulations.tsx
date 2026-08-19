import React from "react";
import { useQueries } from "@tanstack/react-query";
import { Banner, Typography } from "@equinor/eds-core-react";
import { getResultForSimulation, ResultIsPending } from "@/api/api";
import BarChart from "@/components/Charts/BarChart";
import ConcentrationTable from "@/components/ConcentrationTable";
import { ChartDataSet } from "@/dto/ChartData";
import { getCo2RichConcentrations, SimulationResults } from "@/dto/SimulationResults";
import ComparisonPage from "@/components/Comparison/ComparisonPage";

type SimulationComparison = {
    id: string;
    modelName: string;
    inputConcentrations: Record<string, number>;
    outputConcentrations: Record<string, number>;
};

interface CompareSimulationsProps {
    simulationIds: string[];
}

const CompareSimulations: React.FC<CompareSimulationsProps> = ({ simulationIds }) => {
    const queries = useQueries({
        queries: simulationIds.map((id) => ({
            queryKey: ["simulation", id],
            queryFn: () => getResultForSimulation(id),
            retry: (_count: number, error: Error) => error instanceof ResultIsPending,
            retryDelay: () => 2000,
        })),
    });

    const isLoading = queries.some((query) => query.isLoading);
    const hasError = queries.some((query) => query.isError);

    const simulationResults = queries
        .map((query) => query.data)
        .filter((result): result is SimulationResults => result !== undefined);
    const comparisons: SimulationComparison[] = simulationResults.map((result, index) => {
        const finalResult = [...result.results].reverse().find((modelResult) => modelResult.phases.length > 0);

        return {
            id: simulationIds[index],
            modelName: result.input.models[0]?.modelId ?? "Unknown",
            inputConcentrations: result.input.concentrations,
            outputConcentrations: getCo2RichConcentrations(finalResult?.phases),
        };
    });

    const firstInput = comparisons[0] ? JSON.stringify(Object.entries(comparisons[0].inputConcentrations).sort()) : "";
    const allInputsMatch =
        comparisons.length < 2 ||
        comparisons.every(
            (comparison) => JSON.stringify(Object.entries(comparison.inputConcentrations).sort()) === firstInput
        );

    const collectUniqueSubstances = (
        field: keyof Pick<SimulationComparison, "inputConcentrations" | "outputConcentrations">
    ) => Array.from(new Set(comparisons.flatMap((comparison) => Object.keys(comparison[field])))).sort();

    const inputSubstances = collectUniqueSubstances("inputConcentrations");
    const significantOutputs = collectUniqueSubstances("outputConcentrations").filter((substance) =>
        comparisons.some((comparison) => (comparison.outputConcentrations[substance] ?? 0) >= 0.01)
    );
    const chartData: ChartDataSet[] = comparisons.map((comparison) => ({
        label: `${comparison.modelName} (${comparison.id.slice(0, 8)})`,
        data: significantOutputs.map((substance) => ({
            x: substance,
            y: comparison.outputConcentrations[substance] ?? 0,
        })),
    }));

    return (
        <ComparisonPage
            title="Compare Simulations"
            isEmpty={simulationIds.length === 0}
            emptyMessage="No simulations selected for comparison."
            isLoading={isLoading}
            hasError={hasError}
            errorMessage="Error loading simulation results"
        >
            {!allInputsMatch && (
                <Banner style={{ marginBottom: "2rem" }}>
                    <Banner.Icon variant="warning">⚠️</Banner.Icon>
                    <Banner.Message>
                        Warning: The selected simulations have different input concentrations. You may be comparing
                        incompatible scenarios.
                    </Banner.Message>
                </Banner>
            )}

            <Typography variant="h4" style={{ marginBottom: "1rem" }}>
                Input Concentrations
            </Typography>
            <ConcentrationTable
                substances={inputSubstances}
                simulations={comparisons.map((comparison) => ({
                    id: comparison.id,
                    modelName: comparison.modelName,
                    concentrations: comparison.inputConcentrations,
                }))}
                highlightDifferences
            />

            <Typography variant="h4" style={{ marginBottom: "1rem", marginTop: "3rem" }}>
                Output Concentrations
            </Typography>
            <BarChart graphData={chartData} aspectRatio={3} xLabel="Components" yLabel="Concentration (ppm·mol)" />

            <Typography variant="h5" style={{ marginBottom: "1rem" }}>
                Concentration Values (≥ 0.01)
            </Typography>
            <ConcentrationTable
                substances={significantOutputs}
                simulations={comparisons.map((comparison) => ({
                    id: comparison.id,
                    modelName: comparison.modelName,
                    concentrations: comparison.outputConcentrations,
                }))}
            />
        </ComparisonPage>
    );
};

export default CompareSimulations;
