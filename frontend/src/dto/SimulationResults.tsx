export interface SimulationResults {
    results: {
        initfinaldiff: {
            initial: { [key: string]: number };
            final: { [key: string]: number };
            change: { [key: string]: number };
        };
    };
    analysis: {
        common_paths: {
            paths: Record<string, string>;
            k: Record<string, string>;
            frequency: Record<string, number>;
        };
        stats: {
            index: Record<string, string>;
            k: Record<string, string>;
            frequency: Record<string, number>;
        };
    };
    chart_data: {
        comps: { [key: string]: string };
        values: { [key: string]: number };
        variance: { [key: string]: number };
        variance_minus: { [key: string]: number };
    };
}
