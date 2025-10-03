import React from "react";
import { Table } from "@equinor/eds-core-react";

interface GenericTableProps {
    data: Record<string, any>[];
}

const GenericTable: React.FC<GenericTableProps> = ({ data }) => {
    if (!data || data.length === 0) return <div>No data</div>;

    const columns = Object.keys(data[0]);

    return (
        <Table>
            <Table.Head>
                <Table.Row>
                    {columns.map((col) => (
                        <Table.Cell key={col}>{col}</Table.Cell>
                    ))}
                </Table.Row>
            </Table.Head>
            <Table.Body>
                {data.map((row, idx) => (
                    <Table.Row key={idx}>
                        {columns.map((col) => (
                            <Table.Cell key={col}>
                                {typeof row[col] === "number"
                                    ? Math.abs(row[col]) < 0.001
                                        ? "-"
                                        : row[col].toFixed(2)
                                    : (row[col] ?? "-")}
                            </Table.Cell>
                        ))}
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
};

export default GenericTable;
