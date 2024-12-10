import uvicorn

if __name__ == "__main__":
    uvicorn.run("acidwatch_api.app:app", host="localhost", port=8001, reload=True)
