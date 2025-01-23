export interface Simulation {
    id: number;
    name: string;
    owner: string;
    scenario_inputs: {
        concs: { [key: string]: number };
        settings: { [key: string]: number };
    };
    date: string;
}
