
export interface ExperimentResult {
    id: string,
    experimentName: string; // CDC-049-A
    initialConcentrations: Record<string,number>;
    finalConcentrations: Record<string,number>;
    pressure: number|null;
    temperature: number|null;
    time: number|null; // Elapsed experiment time in hours
    arcsId: string;
}