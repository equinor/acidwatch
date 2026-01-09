import { convertSimulationQueriesResultToTabulatedData, convertTabulatedDataToCSVFormat } from "@/functions/Formatting";
import DownloadButton from "../DownloadButton";
import { ChainedSimulationResults } from "@/dto/SimulationResults";
import Working from "./Working";
import NoResults from "./NoResults";
import Results from "./Results";
import { Typography } from "@equinor/eds-core-react";

type ResultStepProps = {
    chainedResults?: ChainedSimulationResults;
    isLoading: boolean;
};
const ResultStep: React.FC<ResultStepProps> = ({ chainedResults, isLoading }) => {
    if (isLoading) {
        return <Working />;
    } else if (chainedResults === undefined) {
        return <NoResults />;
    } else {
        return (
            <>
                {chainedResults.stages.map((stage, index) => (
                    <div key={index} style={{ marginBottom: "2rem" }}>
                        <Typography variant="h4" style={{ marginBottom: "1rem" }}>
                            {stage.modelInput.modelId} Results
                            {stage.status === "failed" && (
                                <span style={{ color: "red", marginLeft: "1rem" }}>
                                    (Failed: {stage.error})
                                </span>
                            )}
                        </Typography>
                        {stage.status !== "failed" && <Results simulationResults={stage} />}
                    </div>
                ))}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: "1rem",
                        marginBottom: "2rem",
                    }}
                >
                    <DownloadButton
                        csvContent={convertTabulatedDataToCSVFormat([
                            ...convertSimulationQueriesResultToTabulatedData(
                                chainedResults.stages.reduce(
                                    (acc, stage) => ({
                                        ...acc,
                                        [stage.modelInput.modelId]: [stage],
                                    }),
                                    {}
                                )
                            ),
                        ])}
                        fileName={`AcidWatch-ModelResults-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`}
                        isLoading={isLoading}
                    />
                </div>
            </>
        );
    }
};

export default ResultStep;
