export interface TextPanel {
    type: "text";
    label?: string;
    data: string;
}

export interface JsonPanel {
    type: "json";
    label?: string;
    data: any;
}

export interface ReactionPathsPanel {
    type: "reaction_paths";
    label?: string;
    common_paths: any;
    stats: any;
}

export type Panel = TextPanel | JsonPanel | ReactionPathsPanel;

export interface SimulationResults {
    initial_concentrations: { [key: string]: number };
    final_concentrations: { [key: string]: number };
    panels: Panel[];
}
