import { useQueries, type Query } from "@tanstack/react-query";
import { Typography } from "@equinor/eds-core-react";
import { getGridSimulationResult } from "@/api/api";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { useAvailableModels } from "@/contexts/ModelContext";
import { gridModelLabel } from "@/utils/modelUtils";
import ModelAccordionLayout from "@/components/ModelAccordionLayout";
import { ModelSeriesSection } from "@/components/PhaseSeriesView";
import { buildModelAccordionItems } from "@/utils/accordionItems";
import ConcentrationTable, { SimulationConcentrations } from "@/components/Tables/ConcentrationTable";
import ComparisonPage from "@/components/Comparison/ComparisonPage";

interface CompareGridSimulationsProps {
    gridIds: string[];
}

const CompareGridSimulations: React.FC<CompareGridSimulationsProps> = ({ gridIds }) => {
    const { models } = useAvailableModels();

    const queries = useQueries({
        queries: gridIds.map((id) => ({
            queryKey: ["grid-simulation", id],
            queryFn: () => getGridSimulationResult(id),
            refetchInterval: (query: Query<GridSimulationResult>) =>
                query.state.data?.status === "pending" || query.state.data?.status === "processing" ? 2000 : false,
        })),
    });

    const isLoading = queries.some((q) => q.isLoading);
    const hasError = queries.some((q) => q.isError);
    const results = queries.map((q) => q.data).filter((data): data is GridSimulationResult => data !== undefined);
    const referenceResult = results.at(0);

    const inputModels = referenceResult?.simulations[0]?.input.models ?? [];
    const items = buildModelAccordionItems(inputModels, models, (modelIndex) => (
        <ModelSeriesSection results={results} modelIndex={modelIndex} />
    ));

    const gridInputs: SimulationConcentrations[] = results.map((result, index) => {
        const ranges = Object.fromEntries(result.axes.map((axis) => [axis.substance, axis.range]));
        return {
            id: gridIds[index],
            modelName: gridModelLabel(result),
            concentrations: result.simulations[0]?.input.concentrations ?? {},
            ranges,
        };
    });

    const inputSubstances = Array.from(
        new Set(gridInputs.flatMap((grid) => [...Object.keys(grid.concentrations), ...Object.keys(grid.ranges ?? {})]))
    ).sort();

    return (
        <ComparisonPage
            title="Compare Grid Simulations"
            isEmpty={gridIds.length === 0}
            emptyMessage="No grid simulations selected for comparison."
            isLoading={isLoading}
            hasError={hasError}
            errorMessage="Error loading grid simulation results"
        >
            <Typography variant="h4" style={{ margin: "1rem 0" }}>
                Input Concentrations
            </Typography>

            <div style={{ marginBottom: "2rem" }}>
                <ConcentrationTable substances={inputSubstances} simulations={gridInputs} highlightDifferences />
            </div>

            <Typography variant="h4" style={{ margin: "1rem 0" }}>
                Output Concentrations
            </Typography>
            <ModelAccordionLayout items={items} />
        </ComparisonPage>
    );
};

export default CompareGridSimulations;
