// reference:
// https://pubchem.ncbi.nlm.nih.gov/compound/<compound_id>

export const FORMULA_TO_NAME_MAPPER: Record<string, string> = {
    Ar: "argon",
    O2: "oxygen",
    H2O: "water",
    H2S: "hydrogen sulfide",
    SO2: "sulfur dioxide",
    NO2: "nitrogen dioxide",
    CH2O2: "formic acid",
    H2: "hydrogen",
    CH3COOH: "acetic acid",
    CH3OH: "methanol",
    CH4: "methane",
    CH3CHO: "acetaldehyde",
    H2CO: "formaldehyde",
    H2SO4: "sulfuric acid",
    S8: "octasulfur",
    H2SO3: "sulfurous acid",
    HNO3: "nitric acid",
    NH3: "Ammonia",
    HNO2: "Nitrous acid",
    NO: "Nitric oxide",
    N2: "Nitrogen",
    NOHSO4: "Sodium Hydrogen Sulfate",
    CH3CH2OH: "ethanol",
    CO: "carbon monoxide",
    HOCH2CH2OH: "MEG", // 174, C2H6O2
    "(CH2CH2OH)2O": "DEG", // 8117, C4H10O3
    "HOCH2(CH2CH2O)2CH2OH": "TEG", // 8172, C6H14O4
    H2NCH2CH2OH: "MEA", // 700, C2H7NO
    "CH3N(C2H4OH)2": "MDEA", // 7767, C5H13NO2
    "(CH2CH2OH)2NH": "DEA", // 8113, C4H11NO2
    CH3CH3: "ethane", // 6324, C2H6
    CH3CH2CH3: "propane", // 334, C3H8
    "(CH3)2CHCH3": "i-butane", // 6360, C4H10
    CH3CH2CH2CH3: "n-butane", // 7843, C4H10
    "CH3(CH2)3CH3": "n-pentane", // 8003, C5H12
    "CH2=CH2": "ethylene", // 6325, C2H4
    C6H5CH3: "toluene", // 1140, C7H8
    "C6H4(CH3)2": "o-Xylene", // 7237, C8H10
};
