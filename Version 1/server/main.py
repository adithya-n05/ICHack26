from fastapi import FastAPI

app = FastAPI(title="ICHack26 API", version="0.1.0")


@app.get("/")
def root():
    return {"message": "Hello from FastAPI"}


@app.get("/health")
def health():
    return {"status": "ok"}
