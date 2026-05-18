interface ChartDataPoint {
    x: string;
    y: number | null;
}

export interface ChartDataSet {
    label: string;
    data: ChartDataPoint[];
    backgroundColor?: string | string[];
    hidden?: boolean;
    color?: string;
}
export interface TabulatedResultRow {
    [key: string]: number | string;
}
