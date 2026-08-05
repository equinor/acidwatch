from acidwatch_models.base import BaseAdapter

from .phpitz_reactive import VALID_SUBSTANCES


class PhpitzSolubilityAdapter(BaseAdapter):
    model_id = "phpitz_solubility"
    display_name = "pHPitz solubility"
    valid_substances = VALID_SUBSTANCES
    description = "Computational model developed by Baard Kaasa as part of our CCS research on CO2 Impurities. Solubility part."
    category = "PhaseEquilibrium"
