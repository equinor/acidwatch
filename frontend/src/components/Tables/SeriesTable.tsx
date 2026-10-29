import React from "react";
import { Table } from "@equinor/eds-core-react";
import { formatConcentration } from "@/functions/Formatting";
import { LineSeries } from "@/components/Charts/LineChart";
import ScrollableTable, { ROW_HEIGHT_REM } from "@/components/Tables/ScrollableTable";

export interface SeriesGroup {
    label?: string;
    series: LineSeries[];
}

interface SeriesTableProps {
    xValues: number[];
    groups: SeriesGroup[];
    xLabel: string;
}

const groupBorder = (groupIndex: number, seriesIndex: number): React.CSSProperties | undefined =>
    groupIndex > 0 && seriesIndex === 0 ? { borderLeft: "2px solid #dcdcdc" } : undefined;

const SeriesTable: React.FC<SeriesTableProps> = ({ xValues, groups, xLabel }) => {
    const hasGroupHeader = groups.some((group) => group.label);

    return (
        <ScrollableTable
            rowCount={xValues.length}
            head={
                <>
                    <Table.Row>
                        <Table.Cell rowSpan={hasGroupHeader ? 2 : 1}>{xLabel}</Table.Cell>
                        {hasGroupHeader
                            ? groups.map((group, groupIndex) => (
                                  <Table.Cell
                                      key={groupIndex}
                                      colSpan={group.series.length}
                                      style={{ textAlign: "center", ...groupBorder(groupIndex, 0) }}
                                  >
                                      {group.label}
                                  </Table.Cell>
                              ))
                            : groups[0]?.series.map((s, seriesIndex) => (
                                  <Table.Cell key={seriesIndex}>{s.label}</Table.Cell>
                              ))}
                    </Table.Row>
                    {hasGroupHeader && (
                        <Table.Row>
                            {groups.flatMap((group, groupIndex) =>
                                group.series.map((s, seriesIndex) => (
                                    <Table.Cell
                                        key={`${groupIndex}-${seriesIndex}`}
                                        style={{ top: `${ROW_HEIGHT_REM}rem`, ...groupBorder(groupIndex, seriesIndex) }}
                                    >
                                        {s.label}
                                    </Table.Cell>
                                ))
                            )}
                        </Table.Row>
                    )}
                </>
            }
        >
            {xValues.map((x, index) => (
                <Table.Row key={x}>
                    <Table.Cell>{x}</Table.Cell>
                    {groups.flatMap((group, groupIndex) =>
                        group.series.map((s, seriesIndex) => (
                            <Table.Cell
                                key={`${groupIndex}-${seriesIndex}`}
                                style={groupBorder(groupIndex, seriesIndex)}
                            >
                                {s.data[index] === null ? "–" : formatConcentration(s.data[index])}
                            </Table.Cell>
                        ))
                    )}
                </Table.Row>
            ))}
        </ScrollableTable>
    );
};

export default SeriesTable;
