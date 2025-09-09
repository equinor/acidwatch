interface ChartDataPoint {
    x: string;
    y: number | null;
}

export interface ChartDataSet {
    label: string;
    data: ChartDataPoint[];
    backgroundColor?: string | string[];
    hidden?: boolean;
}
