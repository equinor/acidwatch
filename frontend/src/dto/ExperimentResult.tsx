export interface ExperimentResult {
    name: string; // CDC-049-A
    initial_concentrations: Record<string, number>;
    final_concentrations: Record<string, number>;
    pressure: number | null;
    temperature: number | null;
    time: number | null; // Elapsed experiment time in hours
}
