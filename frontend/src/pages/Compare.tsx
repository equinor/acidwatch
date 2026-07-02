import React from "react";
import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { getResultForSimulation, ResultIsPending } from "@/api/api";
import { MainContainer } from "@/components/styles";
import { Typography, CircularProgress, Banner } from "@equinor/eds-core-react";
import { SimulationResults, getCo2RichConcentrations } from "@/dto/SimulationResults";
import BarChart from "@/components/BarChart";
import { ChartDataSet } from "@/dto/ChartData";
import ConcentrationTable from "@/components/ConcentrationTable";
import CompareGridSimulations from "@/components/GridSimulation/CompareGridSimulations";

type SimulationComparison = {
    id: string;
    modelName: string;
    inputConcentrations: Record<string, number>;
    outputConcentrations: Record<string, number>;
};

const Compare: React.FC = () => {
    const [searchParams] = useSearchParams();
    const gridParam = searchParams.get("grids");
    const idsParam = searchParams.get("ids");

    if (gridParam) {
        const gridIds = gridParam.split(",").filter(Boolean);
        return <CompareGridSimulations gridIds={gridIds} />;
    }

    const simulationIds = idsParam ? idsParam.split(",").filter(Boolean) : [];
    return <CompareSimulations simulationIds={simulationIds} />;
};

const CompareSimulations: React.FC<{ simulationIds: string[] }> = ({ simulationIds }) => {
    const queries = useQueries({
        queries: simulationIds.map((id) => ({
            queryKey: ["simulation", id],
            queryFn: () => getResultForSimulation(id),
            retry: (_count: number, error: Error) => error instanceof ResultIsPending,
            retryDelay: () => 2000,
        })),
    });

    const isLoading = queries.some((q) => q.isLoading);
    const hasError = queries.some((q) => q.isError);

    let content;

    if (simulationIds.length === 0) {
        content = <Typography variant="body_short">No simulations selected for comparison.</Typography>;
    } else if (isLoading) {
        content = <CircularProgress />;
    } else if (hasError) {
        content = (
            <Typography variant="body_short" style={{ color: "red" }}>
                Error loading simulation results
            </Typography>
        );
    }

    if (content) {
        return (
            <MainContainer>
                <Typography variant="h2" style={{ marginBottom: "2rem" }}>
                    Compare Simulations
                </Typography>
                {content}
            </MainContainer>
        );
    }

    const simulationResults = queries.map((q) => q.data as SimulationResults);

    const comparisons: SimulationComparison[] = simulationResults.map((result, index) => {
        const finalResult = [...result.results].reverse().find((r) => r.phases.length > 0);
        const firstModel = result.input.models[0];

        return {
            id: simulationIds[index],
            modelName: firstModel?.modelId || "Unknown",
            inputConcentrations: result.input.concentrations || {},
            outputConcentrations: getCo2RichConcentrations(finalResult?.phases),
        };
    });

    const allInputsMatch = (() => {
        if (comparisons.length < 2) return true;

        const firstInputStr = JSON.stringify(Object.entries(comparisons[0].inputConcentrations).sort());
        return comparisons.every(
            (comp) => JSON.stringify(Object.entries(comp.inputConcentrations).sort()) === firstInputStr
        );
    })();

    const collectUniqueSubstances = (
        field: keyof Pick<SimulationComparison, "inputConcentrations" | "outputConcentrations">
    ) => {
        const substances = new Set<string>();
        comparisons.forEach((comp) => {
            Object.keys(comp[field]).forEach((substance) => substances.add(substance));
        });
        return Array.from(substances).sort();
    };

    const inputSubstances = collectUniqueSubstances("inputConcentrations");
    const outputSubstances = collectUniqueSubstances("outputConcentrations");

    const significantOutputs = outputSubstances.filter((substance) =>
        comparisons.some((comp) => (comp.outputConcentrations[substance] || 0) >= 0.01)
    );

    const chartData: ChartDataSet[] = comparisons.map((comp) => ({
        label: `${comp.modelName} (${comp.id.slice(0, 8)})`,
        data: significantOutputs.map((substance) => ({
            x: substance,
            y: comp.outputConcentrations[substance] || 0,
        })),
    }));

    return (
        <MainContainer>
            <Typography variant="h2" style={{ marginBottom: "2rem" }}>
                Compare Simulations
            </Typography>

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
                simulations={comparisons.map((c) => ({
                    id: c.id,
                    modelName: c.modelName,
                    concentrations: c.inputConcentrations,
                }))}
                highlightDifferences={true}
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
                simulations={comparisons.map((c) => ({
                    id: c.id,
                    modelName: c.modelName,
                    concentrations: c.outputConcentrations,
                }))}
            />
        </MainContainer>
    );
};

export default Compare;
