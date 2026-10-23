import React from "react";
import { Table } from "@equinor/eds-core-react";
import { formatConcentration } from "@/functions/Formatting";
import { LineSeries } from "@/components/Charts/LineChart";
import ScrollableTable from "@/components/Tables/ScrollableTable";

interface SeriesTableProps {
    xValues: number[];
    series: LineSeries[];
    xLabel: string;
}

const SeriesTable: React.FC<SeriesTableProps> = ({ xValues, series, xLabel }) => (
    <ScrollableTable
        rowCount={xValues.length}
        head={
            <Table.Row>
                <Table.Cell>{xLabel}</Table.Cell>
                {series.map((s, seriesIndex) => (
                    <Table.Cell key={seriesIndex}>{s.label}</Table.Cell>
                ))}
            </Table.Row>
        }
    >
        {xValues.map((x, index) => (
            <Table.Row key={x}>
                <Table.Cell>{x}</Table.Cell>
                {series.map((s, seriesIndex) => (
                    <Table.Cell key={seriesIndex}>
                        {s.data[index] === null ? "–" : formatConcentration(s.data[index])}
                    </Table.Cell>
                ))}
            </Table.Row>
        ))}
    </ScrollableTable>
);

export default SeriesTable;
