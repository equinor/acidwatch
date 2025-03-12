import React, { useState } from "react";
import { Button, Table, Typography } from "@equinor/eds-core-react";
import { SimulationResults } from "../dto/SimulationResults";
import { convertToSubscripts, removeSubsFromString } from "../functions/Formatting";

interface ResultsProps {
    simulationResults: SimulationResults;
}

const Reactions: React.FC<ResultsProps> = ({ simulationResults }) => {
    let common_paths, reactions;
    const [isReactionsLimited, setIsReactionsLimited] = useState<boolean>(true);
    const reactionLimit = 5;
    try {
        common_paths = simulationResults.analysis.common_paths;
        reactions = simulationResults.analysis.stats;
    } catch (error) {
        console.error("Error processing simulation results:", error);
        return <div>No reactions</div>;
    }

    const handleShowMoreLessReactions = () => {
        setIsReactionsLimited(!isReactionsLimited);
    };
    return (
        <div>
            <br />
            <Typography variant="h5">Most frequent reactions</Typography>
            <br />
            <Table>
                <Table.Head>
                    <Table.Row>
                        <Table.Cell>Reaction</Table.Cell>
                        <Table.Cell>k</Table.Cell>
                        <Table.Cell>Frequency</Table.Cell>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {Object.keys(reactions.index)
                        .filter((key) => Number(key) < reactionLimit || !isReactionsLimited)
                        .map((key, index) => (
                            <Table.Row key={index}>
                                <Table.Cell>{convertToSubscripts(reactions.index[key])}</Table.Cell>
                                <Table.Cell>{reactions.k[key]}</Table.Cell>
                                <Table.Cell>{reactions.frequency[key]}</Table.Cell>
                            </Table.Row>
                        ))}
                </Table.Body>
            </Table>
            {Object.keys(reactions.index).length > reactionLimit && (
                <Button variant="ghost" onClick={() => handleShowMoreLessReactions()}>
                    {isReactionsLimited ? "Show more" : "Show less"}
                </Button>
            )}
            <br />
            <br />
            <br />
            <Typography variant="h5">Most frequent paths</Typography>
            <br />
            {common_paths.paths && common_paths.paths[0] !== null ? (
                <Table>
                    <Table.Head>
                        <Table.Row>
                            <Table.Cell>Path</Table.Cell>
                            <Table.Cell>k</Table.Cell>
                            <Table.Cell>Frequency</Table.Cell>
                        </Table.Row>
                    </Table.Head>
                    <Table.Body>
                        {Object.keys(common_paths.paths).map((key) => {
                            const pathReactions = common_paths.paths[key].split("\n");
                            const kValues = common_paths.k[key].split("\n");
                            return pathReactions.map((reaction, reactionIndex) => (
                                <Table.Row key={`${key}-${reactionIndex}`}>
                                    <Table.Cell>{convertToSubscripts(removeSubsFromString(reaction))}</Table.Cell>
                                    <Table.Cell>{kValues[reactionIndex]}</Table.Cell>
                                    {reactionIndex === 0 && (
                                        <Table.Cell rowSpan={pathReactions.length}>
                                            {common_paths.frequency[key]}
                                        </Table.Cell>
                                    )}
                                </Table.Row>
                            ));
                        })}
                    </Table.Body>
                </Table>
            ) : (
                <Typography>No paths available.</Typography>
            )}
        </div>
    );
};

export default Reactions;
