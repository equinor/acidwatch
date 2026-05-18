import chroma from "chroma-js";

export const EQUINOR_CHART_PALETTE: readonly string[] = [
    "#007079", // Moss Green 100
    "#FF1243", // Energy Red 100
    "#243746", // Slate Blue 100
    "#FFC67A", // Spruce Wood 100
    "#7193AE", // Mist Blue 100
    "#A8CED1", // Lichen Green 55
    "#EB0037", // Equinor Red
    "#3AADA8", // Moss Green 55
    "#FF92A8", // Energy Red 55
] as const;

export const LAB_RESULT_COLOR_FAMILIES: readonly (readonly string[])[] = [
    ["#243746", "#2A4D74", "#49709C", "#7294BB", "#A8C3DB", "#DFF5FF"], // North Sea
    ["#007079", "#458C83", "#85B7A5", "#AAD5BB", "#C3E4CE", "#E6FAEC"], // Norwegian Woods
    ["#7D0023", "#DF6D62", "#E9947C", "#EEA990", "#F8D1AF", "#FFE7D6"], // Sand & Summer
] as const;

export const getLabResultColor = (experimentIndex: number, datasetIndexWithinExperiment: number): string => {
    const family = LAB_RESULT_COLOR_FAMILIES[experimentIndex % LAB_RESULT_COLOR_FAMILIES.length];
    return family[datasetIndexWithinExperiment % family.length];
};

export const getDistributedColor = (current: number, total: number): string => {
    if (total <= 0) return EQUINOR_CHART_PALETTE[0];

    if (total <= EQUINOR_CHART_PALETTE.length) {
        return EQUINOR_CHART_PALETTE[current % EQUINOR_CHART_PALETTE.length];
    }

    const scale = chroma.scale([...EQUINOR_CHART_PALETTE]).mode("lab");
    return scale(current / Math.max(total - 1, 1)).hex();
};
