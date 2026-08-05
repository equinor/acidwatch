from acidwatch_models.base import BaseAdapter
from acidwatch_models.definitions import (
    ArcsAdapter,
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
            ArcsAdapter,
            ArcsExpAdapter,
            SolubilityCCSAdapter,
            GibbsMinimizationModelAdapter,
            PhpitzReactiveAdapter,
            PhpitzSolubilityAdapter,
        )
    }
