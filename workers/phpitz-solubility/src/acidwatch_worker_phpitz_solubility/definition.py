from acidwatch_worker_runtime import BaseAdapter, BaseParameters, Parameter

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


class PhpitzModelParameters(BaseParameters):
    heterogeneous_cond_factor: float = Parameter(
        default=1,
        label="Hetrogeneous condensation factor",
        description="Increases possibility for condensation of aqueous acid phase",
        min=1,
        max=100,
    )


class PhpitzSolubilityAdapter(BaseAdapter):
    model_id = "phpitz_solubility"
    display_name = "pHPitz solubility"
    valid_substances = VALID_SUBSTANCES
    description = "Computational model developed by Baard Kaasa as part of our CCS research on CO2 Impurities. Solubility part."
    category = "PhaseEquilibrium"
    parameters: PhpitzModelParameters
