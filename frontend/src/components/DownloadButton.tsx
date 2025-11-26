import React from "react";
import { Button, Icon } from "@equinor/eds-core-react";
import { save } from "@equinor/eds-icons";
import { downloadTabulatedDataAsCSV } from "@/functions/Formatting";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { SimulationResults } from "@/dto/SimulationResults";

interface DownloadButtonProps {
    simulationResultsPerExperiment: Record<string, SimulationResults[]>;
    experimentResults: ExperimentResult[];
    isDisabled?: boolean;
    isLoading?: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ simulationResultsPerExperiment, experimentResults }) => {
    const handleDownload = () => {
        downloadTabulatedDataAsCSV(simulationResultsPerExperiment, experimentResults);
    };

    const hasData = simulationResultsPerExperiment || experimentResults.length > 0;

    return (
        <Button variant="outlined" onClick={handleDownload} disabled={!hasData} style={{ marginLeft: "1rem" }}>
            <Icon data={save} />
            {hasData ? "Processing..." : "Download CSV"}
        </Button>
    );
};

export default DownloadButton;
