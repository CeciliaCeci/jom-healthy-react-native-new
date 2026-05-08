from fastapi import FastAPI
from ai_chat import router as ai_chat_router

app = FastAPI()

app.include_router(ai_chat_router, prefix="/ai")

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"message": "Backend running"}