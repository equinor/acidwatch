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
                {Object.keys(initFinalDiff.initial).map((key, index) => (
                    <Table.Row key={index}>
                        <Table.Cell>{key}</Table.Cell>
                        <Table.Cell>{initFinalDiff.initial[key].toFixed(3)}</Table.Cell>
                        <Table.Cell>{initFinalDiff.final[key].toFixed(3)}</Table.Cell>
                        <Table.Cell>{initFinalDiff.change[key].toFixed(3)}</Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
};

export default ResultConcTable;
