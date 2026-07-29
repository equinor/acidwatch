from acidwatch_models.base import BaseAdapter
from acidwatch_models.definitions import (
    ArcsExpAdapter,
    GibbsMinimizationModelAdapter,
    PhpitzReactiveAdapter,
    PhpitzSolubilityAdapter,
    SolubilityCCSAdapter,
    TocomoAdapter,
)


type AdapterSet = dict[str, type[BaseAdapter]]


def get_adapters() -> AdapterSet:
    return {
        adapter.model_id: adapter
        for adapter in (
            TocomoAdapter,
            ArcsExpAdapter,
            SolubilityCCSAdapter,
            GibbsMinimizationModelAdapter,
            PhpitzReactiveAdapter,
            PhpitzSolubilityAdapter,
        )
    }
