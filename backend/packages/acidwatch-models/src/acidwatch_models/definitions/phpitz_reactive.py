from acidwatch_models.base import BaseAdapter


VALID_SUBSTANCES = [
    "O2",
    "H2O",
    "H2S",
    "SO2",
    "NO2",
    "N2",
    "NO",
    "H2SO4",
    "HNO3",
    "S8",
    "NH3",
    "N2O",
    "N2O4",
    "NH4HSO4",
    "HCHO",
    "CH3CHO",
    "CH3COCH3",
    "HCOOH",
    "CH3COOH",
]


class PhpitzReactiveAdapter(BaseAdapter):
    model_id = "phpitz_reactive"
    display_name = "pHPitz reactive"
    valid_substances = VALID_SUBSTANCES
    description = "Computational model developed by Baard Kaasa as part of our CCS research on CO2 Impurities."
    category = "ChemicalEquilibrium"
