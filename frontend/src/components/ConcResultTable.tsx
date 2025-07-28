import { Table } from "@equinor/eds-core-react";

interface ResultConcTableProps {
    initialConcentrations: { [key: string]: number };
    finalConcentrations: { [key: string]: number };
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
                {Object.keys(finalConcentrations).map((key, index) => (
                    <Table.Row key={index}>
                        <Table.Cell>{key}</Table.Cell>
                        <Table.Cell>{(initialConcentrations[key] ?? 0).toFixed(3)}</Table.Cell>
                        <Table.Cell>{finalConcentrations[key].toFixed(3)}</Table.Cell>
                        <Table.Cell>
                            {(finalConcentrations[key] - (initialConcentrations[key] ?? 0)).toFixed(3)}
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
};

export default ResultConcTable;
