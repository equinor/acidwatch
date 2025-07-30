import { Table } from "@equinor/eds-core-react";

type InitFinalDiff = {
    initFinalDiff: {
        initial: {
            [key: string]: number;
        };
        final: {
            [key: string]: number;
        };
        change: {
            [key: string]: number;
        };
    };
};

const ResultConcTable: React.FC<InitFinalDiff> = ({ initFinalDiff }) => {
    // Defensive: fallback to empty objects if any are missing
    const initial = initFinalDiff?.initial || {};
    const final = initFinalDiff?.final || {};
    const change = initFinalDiff?.change || {};

    return (
        <Table>
            <Table.Head>
                <Table.Row>
                    <Table.Cell>Component</Table.Cell>
                    <Table.Cell>Initial</Table.Cell>
                    <Table.Cell>Final</Table.Cell>
                    <Table.Cell>Change</Table.Cell>
                </Table.Row>
            </Table.Head>
            <Table.Body>
                {Object.keys(initial).map((key, index) => (
                    <Table.Row key={index}>
                        <Table.Cell>{key}</Table.Cell>
                        <Table.Cell>{typeof initial[key] === "number" ? initial[key].toFixed(3) : ""}</Table.Cell>
                        <Table.Cell>{typeof final[key] === "number" ? final[key].toFixed(3) : ""}</Table.Cell>
                        <Table.Cell>{typeof change[key] === "number" ? change[key].toFixed(3) : ""}</Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
};

export default ResultConcTable;
