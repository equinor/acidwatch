import React from "react";
import { useQueries } from "@tanstack/react-query";
import { Banner, Typography } from "@equinor/eds-core-react";
import { getResultForSimulation, ResultIsPending } from "@/api/api";
import BarChart from "@/components/Charts/BarChart";
import ConcentrationTable from "@/components/Tables/ConcentrationTable";
import { ChartDataSet } from "@/dto/ChartData";
import { Phase, SimulationResults } from "@/dto/SimulationResults";
import ComparisonPage from "@/components/Comparison/ComparisonPage";
import StageAccordionLayout from "@/components/StageAccordionLayout";
import PhaseSections from "@/components/PhaseSections";
import { buildStageAccordionItems } from "@/utils/accordionItems";
import {
    collectOutputSubstances,
    pointOutput,
    significantSubstances,
    visiblePhaseKinds,
} from "@/utils/simulationOutputs";
import { useAvailableModels } from "@/contexts/ModelContext";
import { modelChainLabel, phaseUnit } from "@/utils/modelUtils";

type SimulationComparison = {
    id: string;
    modelName: string;
    inputConcentrations: Record<string, number>;
};

interface PhaseOutputComparisonProps {
    simulations: SimulationResults[];
    comparisons: SimulationComparison[];
    modelIndex: number;
    phaseKind: Phase["kind"];
}

const PhaseOutputComparison: React.FC<PhaseOutputComparisonProps> = ({
    simulations,
    comparisons,
    modelIndex,
    phaseKind,
}) => {
    const substances = significantSubstances(simulations, modelIndex, phaseKind);
    const outputs = simulations.map((sim) =>
        Object.fromEntries(
            collectOutputSubstances([sim], modelIndex, phaseKind).map((s) => [
                s,
                pointOutput(sim, s, modelIndex, phaseKind) ?? 0,
            ])
        )
    );
    const chartData: ChartDataSet[] = comparisons.map((comparison, index) => ({
        label: `${comparison.modelName} (${comparison.id.slice(0, 8)})`,
        data: substances
            .filter((substance) => !(phaseKind === "co2-rich" && substance === "CO2"))
            .map((substance) => ({ x: substance, y: outputs[index][substance] ?? 0 })),
    }));

    return (
        <>
            <BarChart
                graphData={chartData}
                aspectRatio={3}
                xLabel="Components"
                yLabel={`Concentration (${phaseUnit(phaseKind)})`}
            />

            <Typography variant="h5" style={{ marginBottom: "1rem" }}>
                Concentration Values (≥ 0.01)
            </Typography>
            <ConcentrationTable
                substances={substances}
                simulations={comparisons.map((comparison, index) => ({
                    id: comparison.id,
                    modelName: comparison.modelName,
                    concentrations: outputs[index],
                }))}
            />
        </>
    );
};

interface CompareSimulationsProps {
    simulationIds: string[];
}

const CompareSimulations: React.FC<CompareSimulationsProps> = ({ simulationIds }) => {
    const { models } = useAvailableModels();
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
        return {
            id: simulationIds[index],
            modelName: modelChainLabel(result.input.models),
            inputConcentrations: result.input.concentrations,
        };
    });

    const firstInput = comparisons[0] ? JSON.stringify(Object.entries(comparisons[0].inputConcentrations).sort()) : "";
    const allInputsMatch =
        comparisons.length < 2 ||
        comparisons.every(
            (comparison) => JSON.stringify(Object.entries(comparison.inputConcentrations).sort()) === firstInput
        );

    const inputSubstances = Array.from(
        new Set(comparisons.flatMap((comparison) => Object.keys(comparison.inputConcentrations)))
    ).sort();

    const items = buildStageAccordionItems(simulationResults[0]?.input.models ?? [], models, (modelIndex) => (
        <PhaseSections
            phaseKinds={visiblePhaseKinds(simulationResults, modelIndex)}
            renderPhase={(phaseKind) => (
                <PhaseOutputComparison
                    simulations={simulationResults}
                    comparisons={comparisons}
                    modelIndex={modelIndex}
                    phaseKind={phaseKind}
                />
            )}
        />
    ));

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
            <StageAccordionLayout items={items} />
        </ComparisonPage>
    );
};

export default CompareSimulations;
