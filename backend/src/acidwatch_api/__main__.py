from __future__ import annotations
import uvicorn


def main() -> None:
    uvicorn.run("acidwatch_api.app:app", host="localhost", port=8001, reload=True)


if __name__ == "__main__":
    main()
