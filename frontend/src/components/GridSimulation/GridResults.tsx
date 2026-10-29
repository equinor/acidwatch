import React from "react";
import { Banner, Typography } from "@equinor/eds-core-react";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { buildGridCsv } from "@/components/GridSimulation/gridSimulationUtils";
import { optionName } from "@/functions/Substance";
import DownloadButton from "@/components/DownloadButton";
import { useAvailableModels } from "@/contexts/ModelContext";
import { modelChainLabel } from "@/utils/modelUtils";
import StageAccordionLayout from "@/components/StageAccordionLayout";
import { StageSeriesSection } from "@/components/GridSimulation/PhaseSeriesView";
import { buildStageAccordionItems } from "@/utils/accordionItems";

interface GridResultsProps {
    result: GridSimulationResult;
}

const GridResults: React.FC<GridResultsProps> = ({ result }) => {
    const { simulations } = result;
    const { models } = useAvailableModels();

    const firstSim = simulations[0];
    const inputModels = firstSim?.input.models ?? [];

    const erroredSimulations = simulations.filter((sim) => sim.status === "error");
    const doneSimulations = simulations.filter((sim) => sim.status === "done");
    const allFinished = doneSimulations.length + erroredSimulations.length === simulations.length;

    const xAxisSubstance = result.axes[0]?.substance ?? "Unknown";
    const modelLabel = modelChainLabel(inputModels);

    const items = buildStageAccordionItems(inputModels, models, (modelIndex) => (
        <StageSeriesSection results={[result]} modelIndex={modelIndex} />
    ));

    return (
        <>
            <Typography variant="body_short" style={{ marginBottom: "1rem" }}>
                Varying <strong>{optionName(xAxisSubstance)}</strong> across {simulations.length} values using{" "}
                <strong>{modelLabel}</strong>.
            </Typography>

            {!allFinished && (
                <Banner style={{ marginBottom: "1rem" }}>
                    <Banner.Icon variant="info">⏳</Banner.Icon>
                    <Banner.Message>
                        Showing partial results. {doneSimulations.length} of {simulations.length} runs have finished;
                        the rest appear as they complete.
                    </Banner.Message>
                </Banner>
            )}

            {erroredSimulations.length > 0 && (
                <Banner style={{ marginBottom: "1rem" }}>
                    <Banner.Icon variant="warning">⚠️</Banner.Icon>
                    <Banner.Message>
                        {erroredSimulations.length} of {simulations.length} runs failed and are omitted from the chart.
                    </Banner.Message>
                </Banner>
            )}

            <StageAccordionLayout items={items} />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem", marginBottom: "2rem" }}>
                <DownloadButton
                    csvContent={buildGridCsv(result)}
                    fileName={`AcidWatch-Grid-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`}
                    isLoading={false}
                />
            </div>
        </>
    );
};

export default GridResults;
