import { convertSimulationQueriesResultToTabulatedData, convertTabulatedDataToCSVFormat } from "@/functions/Formatting";
import { Banner } from "@equinor/eds-core-react";
import DownloadButton from "../DownloadButton";
import { SimulationResults } from "@/dto/SimulationResults";
import Working from "./Working";
import NoResults from "./NoResults";
import Results from "./Results";

type ResultStepProps = {
    simulationResults?: SimulationResults;
    isLoading: boolean;
    error?: Error | null;
};
const ResultStep: React.FC<ResultStepProps> = ({ simulationResults, isLoading, error }) => {
    if (error) {
        return (
            <Banner style={{ marginBottom: "2rem" }}>
                <Banner.Icon variant="warning">⚠️</Banner.Icon>
                <Banner.Message>{error.message}</Banner.Message>
            </Banner>
        );
    }
    if (isLoading) {
        return <Working />;
    } else if (simulationResults === undefined) {
        return <NoResults />;
    } else {
        return (
            <>
                <Results simulationResults={simulationResults} />
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
                            ...convertSimulationQueriesResultToTabulatedData({
                                [`${simulationResults.input.models[0].modelId}`]: [simulationResults],
                            }),
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
