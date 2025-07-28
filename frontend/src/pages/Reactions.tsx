import React, { useState } from "react";
import { Button, Table, Typography } from "@equinor/eds-core-react";
import { convertToSubscripts, removeSubsFromString } from "../functions/Formatting";

const Reactions: React.FC<{ commonPaths: any; reactions: any }> = ({ commonPaths, reactions }) => {
    const [isReactionsLimited, setIsReactionsLimited] = useState<boolean>(true);
    const reactionLimit = 5;

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
            {commonPaths.paths && commonPaths.paths[0] !== null ? (
                <Table>
                    <Table.Head>
                        <Table.Row>
                            <Table.Cell>Path</Table.Cell>
                            <Table.Cell>k</Table.Cell>
                            <Table.Cell>Frequency</Table.Cell>
                        </Table.Row>
                    </Table.Head>
                    <Table.Body>
                        {Object.keys(commonPaths.paths).map((key) => {
                            const pathReactions: string[] = commonPaths.paths[key].split("\n");
                            const kValues = commonPaths.k[key].split("\n");
                            return pathReactions.map((reaction, reactionIndex) => (
                                <Table.Row key={`${key}-${reactionIndex}`}>
                                    <Table.Cell>{convertToSubscripts(removeSubsFromString(reaction))}</Table.Cell>
                                    <Table.Cell>{kValues[reactionIndex]}</Table.Cell>
                                    {reactionIndex === 0 && (
                                        <Table.Cell rowSpan={pathReactions.length}>
                                            {commonPaths.frequency[key]}
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
