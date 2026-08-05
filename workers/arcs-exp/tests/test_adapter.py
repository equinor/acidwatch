from acidwatch_worker_arcs_exp.adapter import _run_simulation


def test_arcs_calculation_runs_in_process():
    result = _run_simulation(
        {
            "SO2": 10,
            "NO2": 50,
            "H2S": 30,
            "H2O": 20,
        },
        temperature=300,
        pressure=10,
        samples=1,
        ncpus=1,
    )

    assert result
    assert all(concentration >= 0 for concentration in result.values())
