import { convertSimulationQueriesResultToTabulatedData, convertTabulatedDataToCSVFormat } from "@/functions/Formatting";
import DownloadButton from "../DownloadButton";
import { SimulationResults } from "@/dto/SimulationResults";
import Working from "./Working";
import NoResults from "./NoResults";
import Results from "./Results";

type ResultStepProps = {
    simulationResults?: SimulationResults;
    isLoading: boolean;
};
const ResultStep: React.FC<ResultStepProps> = ({ simulationResults, isLoading }) => {
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
                                [`${simulationResults.modelInput.modelId}`]: [simulationResults],
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
