import React from "react";
import { Table } from "@equinor/eds-core-react";
import { formatConcentration } from "@/functions/Formatting";
import { LineSeries } from "@/components/Charts/LineChart";

interface SeriesTableProps {
    xValues: number[];
    series: LineSeries[];
    xLabel: string;
    maxHeight?: string;
}

const SeriesTable: React.FC<SeriesTableProps> = ({ xValues, series, xLabel, maxHeight = "400px" }) => (
    <div style={{ maxHeight, overflow: "auto" }}>
        <Table style={{ width: "100%" }}>
            <Table.Head sticky>
                <Table.Row>
                    <Table.Cell>{xLabel}</Table.Cell>
                    {series.map((s, seriesIndex) => (
                        <Table.Cell key={seriesIndex}>{s.label}</Table.Cell>
                    ))}
                </Table.Row>
            </Table.Head>
            <Table.Body>
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
            </Table.Body>
        </Table>
    </div>
);

export default SeriesTable;
