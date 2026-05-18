import chroma from "chroma-js";

export const EQUINOR_CHART_PALETTE: readonly string[] = [
    "#243746", // North sea
    "#007079", //Norwegian Woods
    "#86A7AC", // Autumn Storm
    "#7D0023", // Sand and summer
    "#FBDD79", //Midnight Sun
] as const;

export const LAB_RESULT_COLOR_FAMILIES: readonly (readonly string[])[] = [
    ["#243746", "#2A4D74", "#49709C", "#7294BB", "#A8C3DB", "#DFF5FF"], // North Sea
    ["#007079", "#458C83", "#85B7A5", "#AAD5BB", "#C3E4CE", "#E6FAEC"], // Norwegian Woods
    ["#7D0023", "#DF6D62", "#E9947C", "#EEA990", "#F8D1AF", "#FFE7D6"], // Sand & Summer
] as const;

export type BarPattern = "solid" | "diagonal" | "crosshatch" | "dots";

export const EXPERIMENT_PATTERNS: readonly BarPattern[] = ["solid", "diagonal", "crosshatch", "dots"] as const;

export const getLabResultColor = (experimentIndex: number, datasetIndexWithinExperiment: number): string => {
    const family = LAB_RESULT_COLOR_FAMILIES[experimentIndex % LAB_RESULT_COLOR_FAMILIES.length];
    return family[datasetIndexWithinExperiment % family.length];
};

export const createBarPattern = (color: string, pattern: BarPattern): CanvasPattern | string => {
    if (pattern === "solid") return color;

    const size = 10;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;

    if (pattern === "diagonal") {
        ctx.beginPath();
        ctx.moveTo(0, size);
        ctx.lineTo(size, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size / 2, size / 2);
        ctx.lineTo(size / 2, -size / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size / 2, size + size / 2);
        ctx.lineTo(size + size / 2, size / 2);
        ctx.stroke();
    } else if (pattern === "crosshatch") {
        ctx.beginPath();
        ctx.moveTo(0, size);
        ctx.lineTo(size, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size, size);
        ctx.stroke();
    } else if (pattern === "dots") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    const canvasPattern = ctx.createPattern(canvas, "repeat");
    return canvasPattern ?? color;
};

export const getDistributedColor = (current: number, total: number): string => {
    if (total <= 0) return EQUINOR_CHART_PALETTE[0];

    if (total <= EQUINOR_CHART_PALETTE.length) {
        return EQUINOR_CHART_PALETTE[current % EQUINOR_CHART_PALETTE.length];
    }

    const scale = chroma.scale([...EQUINOR_CHART_PALETTE]).mode("lab");
    return scale(current / Math.max(total - 1, 1)).hex();
};
