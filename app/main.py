
from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from app.api.v1.api import api_router
from app.core.config import settings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)


app = FastAPI(
    title="User Management Panel",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

app.mount("/static", StaticFiles(directory="web"), name="static")
templates = Jinja2Templates(directory="web")

@app.get("/managment")
async def get_html(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "message": "Hello, FastAPI with Jinja2!"})


app.include_router(api_router, prefix=settings.API_V1_STR)
