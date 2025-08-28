interface ChartDataPoint {
    x: string;
    y: number | null;
}

export interface ChartDataset {
    label: string;
    data: ChartDataPoint[];
    backgroundColor?: string | string[];
    hidden?: boolean;
}
