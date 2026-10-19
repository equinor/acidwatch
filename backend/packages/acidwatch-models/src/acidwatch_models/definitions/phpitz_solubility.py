from acidwatch_models.base import BaseAdapter, BaseParameters, Parameter

from .phpitz_reactive import VALID_SUBSTANCES


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
