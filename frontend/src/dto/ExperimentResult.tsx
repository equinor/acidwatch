
export interface ExperimentResult {
    name: string; // CDC-049-A
    initial_concentration: Record<string,number>;
    final_concentration: Record<string,number>;
    pressure: number|null;
    temperature: number|null;
    time: number|null;
}