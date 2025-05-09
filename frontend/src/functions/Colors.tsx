import chroma from "chroma-js";

export const getDistributedColor = (current: number, total: number) => {
    return chroma.hsl((360 / total) * current, 0.6, 0.5).hex();
};
