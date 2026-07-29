from .arcs import ArcsAdapter
from .arcs_exp import ArcsExpAdapter
from .base import BaseAdapter
from .gibbs_minimization_model import GibbsMinimizationModelAdapter
from .phpitz_reactive import PhpitzReactiveAdapter
from .phpitz_solubility import PhpitzSolubilityAdapter
from .solubilityccs import SolubilityCCSAdapter
from .tocomo import TocomoAdapter


type AdapterSet = dict[str, type[BaseAdapter]]


def get_adapters() -> AdapterSet:
    return {
        adapter.model_id: adapter
        for adapter in (
            TocomoAdapter,
            ArcsAdapter,
            ArcsExpAdapter,
            SolubilityCCSAdapter,
            GibbsMinimizationModelAdapter,
            PhpitzReactiveAdapter,
            PhpitzSolubilityAdapter,
        )
    }
