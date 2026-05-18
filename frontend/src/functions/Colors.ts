import chroma from "chroma-js";

export const EQUINOR_CHART_PALETTE: readonly string[] = [
    "#243746", // North sea
    "#007079", //Norwegian Woods
    "#86A7AC", // Autumn Storm
    "#7D0023", // Sand and summer
    "#FBDD79", //Midnight Sun
] as const;

export const getDistributedColor = (current: number, total: number): string => {
    if (total <= 0) return EQUINOR_CHART_PALETTE[0];

    if (total <= EQUINOR_CHART_PALETTE.length) {
        return EQUINOR_CHART_PALETTE[current % EQUINOR_CHART_PALETTE.length];
    }

    const scale = chroma.scale([...EQUINOR_CHART_PALETTE]).mode("lab");
    return scale(current / Math.max(total - 1, 1)).hex();
};
