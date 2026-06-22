from __future__ import annotations

import logging
from importlib.metadata import entry_points
from functools import lru_cache
from acidwatch_api.models.base import BaseAdapter
from acidwatch_api.settings import SETTINGS


type AdapterSet = dict[str, type[BaseAdapter]]


logger = logging.getLogger(__name__)


@lru_cache()
def get_adapters() -> AdapterSet:
    available_adapters = entry_points(group="acidwatch_api.adapters")
    available_adapters_names = set(entry.name for entry in available_adapters)
    logger.info("Available AcidWatch adapters:", available_adapters_names)

    enabled_adapters = available_adapters_names
    if SETTINGS.enabled_adapters is not None:
        enabled_adapters = SETTINGS.enabled_adapters

    disabled_adapters = set()
    if SETTINGS.disabled_adapters is not None:
        disabled_adapters = SETTINGS.disabled_adapters

    for unknown_adapter in enabled_adapters - available_adapters_names:
        logger.error(f"Can't enable {repr(unknown_adapter)}: Adapter not registered")

    adapters: AdapterSet = {}
    for entry in available_adapters:
        if entry.name not in enabled_adapters:
            logger.info("Skipping adapter", repr(entry.name), "(not enabled)")
            continue

        if entry.name in disabled_adapters:
            logger.info("Skipping adapter", repr(entry.name), "(disabled)")
            continue

        adapter = entry.load()
        assert issubclass(adapter, BaseAdapter)

        adapters[adapter.model_id] = adapter
        logger.info("Adapter", repr(entry.name), "loaded")

    return adapters
