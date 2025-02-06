import React from "react";
import { Table, Typography } from "@equinor/eds-core-react";
import { SimulationResults } from "../dto/SimulationResults";
import Results from "./OutputConcentrations";

interface ResultsProps {
    simulationResults: SimulationResults;
}

const Reactions: React.FC<ResultsProps> = ({ simulationResults }) => {
    let common_paths, reactions;

    try {
        common_paths = simulationResults.analysis.common_paths;
        reactions = simulationResults.analysis.stats;
    } catch (error) {
        console.error("Error processing simulation results:", error);
        return <div></div>;
    }

    const removeSubsFromString = (s: string): string => {
        try {
            s = s.replace(/<sub>/g, "");
            s = s.replace(/<\/sub>/g, "");
            return s;
        } catch (error) {
            console.error("Error in removeSubsFromString:", error);
            return s;
        }
    };

    const convertToSubscripts = (chemicalFormula: string): React.ReactNode => {
        try {
            const regex = /(?<=\p{L})\d|(?=\p{L})\d/gu;
            const matches = [...chemicalFormula.matchAll(regex)];
            const subscriptsRemoved = chemicalFormula.split(regex);

            const result = subscriptsRemoved.flatMap((part, index) =>
                index < matches.length ? [part, <sub key={index}>{matches[index][0]}</sub>] : [part]
            );
            return <p>{result}</p>;
        } catch (error) {
            console.error("Error in convertToSubscripts:", error);
            return <p>{chemicalFormula}</p>;
        }
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
                    {Object.keys(reactions.index).map((key, index) => (
                        <Table.Row key={index}>
                            <Table.Cell>{convertToSubscripts(reactions.index[key])}</Table.Cell>
                            <Table.Cell>{reactions.k[key]}</Table.Cell>
                            <Table.Cell>{reactions.frequency[key]}</Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <br />
            <br />
            <br />
            <Typography variant="h5">Most frequent paths</Typography>
            <br />
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
        </div>
    );
};

export default Reactions;
