# ICHack26 FastAPI Backend

## Setup

```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn server.main:app --reload
```

Server runs at **http://127.0.0.1:8000**

- **Docs (Swagger):** http://127.0.0.1:8000/docs  
- **ReDoc:** http://127.0.0.1:8000/redoc
