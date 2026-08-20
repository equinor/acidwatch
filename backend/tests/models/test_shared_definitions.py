from acidwatch_models import BaseAdapter, get_adapters


def test_shared_registry_contains_model_definitions():
    adapters = get_adapters()

    assert set(adapters) == {
        "arcs",
        "arcs_exp",
        "ccstoolkit",
        "gibbs_minimization",
        "phpitz_reactive",
        "phpitz_solubility",
        "srk_vanlaar",
        "tocomo",
    }
    assert all(issubclass(adapter, BaseAdapter) for adapter in adapters.values())
