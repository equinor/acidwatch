#!/usr/bin/env python3
from time import sleep
from httpx import Client
import os


def main() -> None:
    with Client(base_url=os.environ["VITE_API_URL"]) as client:
        resp = client.post("/models/arcs", json={
            "concs": {
                "O2": 50,
                "H2O": 20,
                "H2S": 30,
                "SO2": 10,
                "NO2": 50,
            },
            "params": {},
        })

        resp.raise_for_status()
        result_id = resp.json()

        for _ in range(100):
            sleep(0.5)
            resp = client.get(f"/results/{result_id}")
            if resp.status_code == 404:
                print(".", end="")
                continue
            print(f"\nStatus: {resp.status_code}")

            result = resp.json()
            if isinstance(result, dict) and (error := result.get("error")) is not None:
                print("\n".join(error))
            else:
                print(result)
            break


if __name__ == "__main__":
    main()
