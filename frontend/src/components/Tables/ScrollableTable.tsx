import React from "react";
import { Table } from "@equinor/eds-core-react";

const ROW_HEIGHT_REM = 3;
const DEFAULT_MAX_VISIBLE_ROWS = 5;

interface ScrollableTableProps {
    head: React.ReactNode;
    rows: React.ReactNode[];
    maxVisibleRows?: number;
}
// Our scrollable table is a tiny bit custom, as it seems eds table mostly works
// then the tables are the entire screen. Our tables however appear down the page
// and unless we place it within a container of its own, the sticky header will scroll
// with the browser edge
const ScrollableTable: React.FC<ScrollableTableProps> = ({ head, rows, maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS }) => (
    <div
        style={
            rows.length > maxVisibleRows
                ? { maxHeight: `${(maxVisibleRows + 1) * ROW_HEIGHT_REM}rem`, overflow: "auto" }
                : undefined
        }
    >
        <Table style={{ width: "100%" }}>
            <Table.Head sticky={rows.length > maxVisibleRows}>{head}</Table.Head>
            <Table.Body>{rows}</Table.Body>
        </Table>
    </div>
);

export default ScrollableTable;
