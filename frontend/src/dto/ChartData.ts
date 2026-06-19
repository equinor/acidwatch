interface ChartDataPoint {
    x: string;
    y: number | null;
}

import { BarPattern } from "@/functions/Colors";

export interface ChartDataSet {
    label: string;
    data: ChartDataPoint[];
    backgroundColor?: string | string[];
    hidden?: boolean;
    color?: string;
    pattern?: BarPattern;
    stack?: string;
}
export interface TabulatedResultRow {
    [key: string]: number | string;
}
