export interface Simulation {
    model: string;
    id: number;
    name: string;
    owner: string;
    scenarioInputs: {
        initialConcentrations: { [key: string]: number };
        parameters: { [key: string]: number };
    };
    date: string;
}
