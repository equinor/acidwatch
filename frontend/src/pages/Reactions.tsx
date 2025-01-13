import React from "react";
import { Table, Typography } from "@equinor/eds-core-react";
import { SimulationResults } from "../dto/SimulationResults";

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

    common_paths = simulationResults.analysis.common_paths;
    reactions = simulationResults.analysis.stats;

    const convertToSubscripts = (chemicalFormula: string): string => {
        const subscriptMap: { [key: string]: string } = {
            "0": "<sub>0</sub>",
            "1": "<sub>1</sub>",
            "2": "<sub>2</sub>",
            "3": "<sub>3</sub>",
            "4": "<sub>4</sub>",
            "5": "<sub>5</sub>",
            "6": "<sub>6</sub>",
            "7": "<sub>7</sub>",
            "8": "<sub>8</sub>",
            "9": "<sub>9</sub>",
        };

        return chemicalFormula.replace(/(?<=\p{L})\d|(?=\p{L})\d/gu, (digit: string) => subscriptMap[digit]);
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
                            <Table.Cell
                                dangerouslySetInnerHTML={{ __html: convertToSubscripts(reactions.index[key]) }}
                            />
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
                    {Object.keys(common_paths.paths).map((key, index) => (
                        <Table.Row key={index}>
                            <Table.Cell dangerouslySetInnerHTML={{ __html: common_paths.paths[key] }} />
                            <Table.Cell>{common_paths.k[key]}</Table.Cell>
                            <Table.Cell>{common_paths.frequency[key]}</Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </div>
    );
};

export default Reactions;
