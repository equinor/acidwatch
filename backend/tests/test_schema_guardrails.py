from __future__ import annotations

from sqlalchemy import PickleType
from acidwatch_api.database import Base


def test_no_pickle_type_columns() -> None:
    """``PickleType`` columns deserialize arbitrary Python objects on read.

    Forbidding them at the schema level prevents the insecure-
    deserialization sink that ``results.python_exception`` previously
    introduced from being reintroduced by accident.
    """
    offenders = [
        f"{table.name}.{column.name}"
        for table in Base.metadata.tables.values()
        for column in table.columns
        if isinstance(column.type, PickleType)
    ]
    assert not offenders, (
        f"PickleType columns are forbidden; found: {offenders}. "
        "Log via logging.exception() or store text/JSON instead."
    )
