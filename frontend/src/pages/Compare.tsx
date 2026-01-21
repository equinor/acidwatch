import React from "react";
import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { getResultForSimulation, ResultIsPending } from "@/api/api";
import { MainContainer } from "@/components/styles";
import { Typography, Table, CircularProgress, Banner } from "@equinor/eds-core-react";
import { SimulationResults } from "@/dto/SimulationResults";
import BarChart from "@/components/BarChart";
import { ChartDataSet } from "@/dto/ChartData";

const formatConcentration = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return "-";

    const absValue = Math.abs(value);
    if (absValue === 0) return "0";
    if (absValue >= 1e5 || absValue <= 1e-5) return value.toExponential(2);
    return value.toFixed(2);
};

type SimulationComparison = {
    id: string;
    modelName: string;
    inputConcentrations: Record<string, number>;
    outputConcentrations: Record<string, number>;
};

type ConcentrationTableProps = {
    substances: string[];
    simulations: Array<{
        id: string;
        modelName: string;
        concentrations: Record<string, number>;
    }>;
    highlightDifferences?: boolean;
};

const ConcentrationTable: React.FC<ConcentrationTableProps> = ({
    substances,
    simulations,
    highlightDifferences = false,
}) => (
    <Table>
        <Table.Head>
            <Table.Row>
                <Table.Cell>Substance</Table.Cell>
                {simulations.map((sim) => (
                    <Table.Cell key={sim.id}>
                        {sim.modelName} ({sim.id.slice(0, 8)})
                    </Table.Cell>
                ))}
            </Table.Row>
        </Table.Head>
        <Table.Body>
            {substances.map((substance) => {
                const values = simulations.map((s) => s.concentrations[substance] || 0);
                const hasVariation = highlightDifferences && new Set(values).size > 1;

                return (
                    <Table.Row key={substance} style={hasVariation ? { backgroundColor: "#fff4e5" } : {}}>
                        <Table.Cell>
                            {substance}
                            {hasVariation && " ⚠️"}
                        </Table.Cell>
                        {simulations.map((sim) => (
                            <Table.Cell key={sim.id}>{formatConcentration(sim.concentrations[substance])}</Table.Cell>
                        ))}
                    </Table.Row>
                );
            })}
        </Table.Body>
    </Table>
);

const Compare: React.FC = () => {
    const [searchParams] = useSearchParams();
    const idsParam = searchParams.get("ids");
    const simulationIds = idsParam ? idsParam.split(",").filter(Boolean) : [];

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
        // Find the last result that has concentrations
        const finalOutput = [...result.results]
            .reverse()
            .find((r) => r.concentrations && Object.keys(r.concentrations).length > 0);
        const firstModel = result.input.models[0];

        return {
            id: simulationIds[index],
            modelName: firstModel?.modelId || "Unknown",
            inputConcentrations: result.input.concentrations || {},
            outputConcentrations: finalOutput?.concentrations || {},
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

            <BarChart graphData={chartData} aspectRatio={3} />

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
