import httpx

from acidwatch.client import Client


def test_run_model_continues_polling_while_processing(monkeypatch):
    client = Client(api_url="http://test")
    responses = iter(
        [
            httpx.Response(200, json="00000000-0000-0000-0000-000000000001"),
            httpx.Response(200, json={"status": "processing"}),
            httpx.Response(
                200,
                json={
                    "status": "done",
                    "results": [
                        {
                            "phases": [
                                {
                                    "kind": "co2-rich",
                                    "fraction": 1,
                                    "concentrations": {"H2O": 5},
                                }
                            ]
                        }
                    ],
                },
            ),
        ]
    )
    monkeypatch.setattr(client, "post", lambda *args, **kwargs: next(responses))
    monkeypatch.setattr(client, "get", lambda *args, **kwargs: next(responses))
    monkeypatch.setattr("acidwatch.client.time.sleep", lambda _: None)

    result = client.run_model("model-a", {"H2O": 10}, {}, retries=2)

    assert result.to_dict(orient="list") == {"H2O": [5.0]}
