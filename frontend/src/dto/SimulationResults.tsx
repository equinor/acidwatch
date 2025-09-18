import { ModelInput } from "./ModelInput";

interface TextPanel {
    type: "text";
    label?: string;
    data: string;
}

interface JsonPanel {
    type: "json";
    label?: string;
    data: any;
}

interface ReactionPathsPanel {
    type: "reaction_paths";
    label?: string;
    common_paths: any;
    stats: any;
}

export type Panel = TextPanel | JsonPanel | ReactionPathsPanel;
export interface SimulationResults {
    modelInput: ModelInput;
    finalConcentrations: { [key: string]: number };
    panels: Panel[];
}
