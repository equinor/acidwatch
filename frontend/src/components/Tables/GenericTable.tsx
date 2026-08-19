import React from "react";
import { Table } from "@equinor/eds-core-react";
import { convertToSubscripts } from "@/functions/Formatting";

type TableValue = string | number | null | undefined;

interface GenericTableProps {
    data: Record<string, TableValue>[];
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
                {data.map((row, rowIndex) => (
                    <Table.Row key={rowIndex}>
                        {columns.map((col) => (
                            <Table.Cell key={col} style={{ whiteSpace: "pre-line" }}>
                                {typeof row[col] === "string" ? convertToSubscripts(row[col]) : row[col]}
                            </Table.Cell>
                        ))}
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
};

export default GenericTable;
