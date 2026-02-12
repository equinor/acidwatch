import { Table } from "@equinor/eds-core-react";

interface ResultConcTableProps {
    initialConcentrations: Record<string, number>;
    finalConcentrations: Record<string, number>;
}
const ResultConcTable: React.FC<ResultConcTableProps> = ({ initialConcentrations, finalConcentrations }) => {
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
                {Object.keys(finalConcentrations)
                    .filter(
                        (key) => (initialConcentrations[key] ?? 0) >= 0.001 || (finalConcentrations[key] ?? 0) >= 0.001
                    )
                    .map((key, index) => {
                        const init = initialConcentrations[key] ?? 0;
                        const final = finalConcentrations[key] ?? 0;
                        const change = final - init;

                        return (
                            <Table.Row key={index}>
                                <Table.Cell>{key}</Table.Cell>
                                <Table.Cell>{init >= 0.001 ? init.toFixed(3) : "-"}</Table.Cell>
                                <Table.Cell>{final >= 0.001 ? final.toFixed(3) : "-"}</Table.Cell>
                                <Table.Cell>{Math.abs(change) >= 0.001 ? change.toFixed(3) : "-"}</Table.Cell>
                            </Table.Row>
                        );
                    })}
            </Table.Body>
        </Table>
    );
};

export default ResultConcTable;
