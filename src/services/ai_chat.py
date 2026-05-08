from fastapi import APIRouter
from pydantic import BaseModel
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def nutrition_chat(request: ChatRequest):

    prompt = f"""
    You are an AI nutrition assistant.

    ONLY answer:
    - food
    - nutrition
    - healthy eating
    - meal planning

    Reject unrelated topics politely.

    User message:
    {request.message}
    """

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt
        )

        return {
            "reply": response.text
        }

    except Exception as e:
        print("Gemini Error:", e)

        return {
            "reply": str(e)
        }