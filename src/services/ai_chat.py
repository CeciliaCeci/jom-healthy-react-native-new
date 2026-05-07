from fastapi import APIRouter
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def nutrition_chat(request: ChatRequest):

    prompt = f"""
    You are a nutrition and meal planning AI assistant.

    ONLY answer:
    - nutrition
    - food
    - meal planning
    - child dietary guidance
    - healthy eating

    Reject unrelated topics politely.

    User message:
    {request.message}
    """

    response = model.generate_content(prompt)

    return {
        "reply": response.text
    }