import React from "react";
import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { getResultForSimulation, ResultIsPending } from "@/api/api";
import { MainContainer } from "@/components/styles";
import { Typography, Table, CircularProgress, Banner } from "@equinor/eds-core-react";
import { ChainedSimulationResults } from "@/dto/SimulationResults";
import BarChart from "@/components/BarChart";
import { ChartDataSet } from "@/dto/ChartData";

const formatConcentration = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return "-";
    
    const absValue = Math.abs(value);
    if (absValue === 0) return "0";
    if (absValue >= 1e5 || absValue <= 1e-5) return value.toExponential(2);
    return value.toFixed(2);
};

type ConcentrationTableProps = {
    substances: string[];
    primaryResults: Array<{
        id: string;
        modelName: string;
        concentrations: Record<string, number>;
    }>;
    highlightDifferences?: boolean;
};

const ConcentrationTable: React.FC<ConcentrationTableProps> = ({ 
    substances, 
    primaryResults, 
    highlightDifferences = false 
}) => (
    <Table>
        <Table.Head>
            <Table.Row>
                <Table.Cell>Substance</Table.Cell>
                {primaryResults.map((result) => (
                    <Table.Cell key={result.id}>
                        {result.modelName} ({result.id.slice(0, 8)})
                    </Table.Cell>
                ))}
            </Table.Row>
        </Table.Head>
        <Table.Body>
            {substances.map((substance) => {
                const values = primaryResults.map((r) => r.concentrations[substance] || 0);
                const hasVariation = highlightDifferences && new Set(values).size > 1;
                
                return (
                    <Table.Row key={substance} style={hasVariation ? { backgroundColor: "#fff4e5" } : {}}>
                        <Table.Cell>
                            {substance}
                            {hasVariation && " ⚠️"}
                        </Table.Cell>
                        {primaryResults.map((result, idx) => (
                            <Table.Cell key={result.id}>
                                {formatConcentration(result.concentrations[substance])}
                            </Table.Cell>
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

    if (simulationIds.length === 0) {
        return (
            <MainContainer>
                <Typography variant="h2">Compare Simulations</Typography>
                <Typography variant="body_short">No simulations selected for comparison.</Typography>
            </MainContainer>
        );
    }

    if (isLoading) {
        return (
            <MainContainer>
                <Typography variant="h2">Compare Simulations</Typography>
                <CircularProgress />
            </MainContainer>
        );
    }

    if (hasError) {
        return (
            <MainContainer>
                <Typography variant="h2">Compare Simulations</Typography>
                <Typography variant="body_short" style={{ color: "red" }}>
                    Error loading simulation results
                </Typography>
            </MainContainer>
        );
    }

    const results = queries.map((q) => q.data as ChainedSimulationResults);

    // Extract primary model results (first stage that has valid concentrations)
    const primaryResults = results.map((result, idx) => {
        const primaryStage = result.stages.find((stage) => stage.status === "done" && stage.finalConcentrations);
        return {
            id: simulationIds[idx],
            modelName: primaryStage?.modelInput.modelId || "Unknown",
            concentrations: primaryStage?.finalConcentrations || {},
            inputConcentrations: primaryStage?.modelInput.concentrations || {},
        };
    });

    // Check if all simulations have the same input concentrations
    const checkInputsMatch = () => {
        if (primaryResults.length < 2) return true;
        
        const firstInput = primaryResults[0].inputConcentrations;
        const firstInputStr = JSON.stringify(Object.entries(firstInput).sort());
        
        return primaryResults.every((result) => {
            const inputStr = JSON.stringify(Object.entries(result.inputConcentrations).sort());
            return inputStr === firstInputStr;
        });
    };

    const inputsMatch = checkInputsMatch();

    // Helper to collect unique substances from a concentration field
    const collectSubstances = (field: 'concentrations' | 'inputConcentrations') => {
        const substances = new Set<string>();
        primaryResults.forEach((result) => {
            Object.keys(result[field]).forEach((substance) => substances.add(substance));
        });
        return Array.from(substances).sort();
    };

    const inputSubstances = collectSubstances('inputConcentrations');
    const allOutputSubstances = collectSubstances('concentrations');

    // Filter substances for chart/table - only show if at least one simulation has value >= 0.01
    const significantOutputSubstances = allOutputSubstances.filter((substance) =>
        primaryResults.some((result) => (result.concentrations[substance] || 0) >= 0.01)
    );

    // Prepare chart data in BarChart format
    const chartData: ChartDataSet[] = primaryResults.map((result) => ({
        label: `${result.modelName} (${result.id.slice(0, 8)})`,
        data: significantOutputSubstances.map((substance) => ({
            x: substance,
            y: result.concentrations[substance] || 0,
        })),
    }));

    return (
        <MainContainer>
            <Typography variant="h2" style={{ marginBottom: "2rem" }}>
                Compare Simulations
            </Typography>

            {!inputsMatch && (
                <Banner style={{ marginBottom: "2rem" }}>
                    <Banner.Icon variant="warning" />
                    <Banner.Message>
                        Warning: The selected simulations have different input concentrations. 
                        You may be comparing incompatible scenarios.
                    </Banner.Message>
                </Banner>
            )}

            <Typography variant="h4" style={{ marginBottom: "1rem" }}>
                Input Concentrations
            </Typography>

            <ConcentrationTable
                substances={inputSubstances}
                primaryResults={primaryResults.map(r => ({
                    id: r.id,
                    modelName: r.modelName,
                    concentrations: r.inputConcentrations,
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
                substances={significantOutputSubstances}
                primaryResults={primaryResults}
            />
        </MainContainer>
    );
};

export default Compare;
