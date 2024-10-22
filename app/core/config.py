from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "YOUR_SECRET_KEY"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "mysql+aiomysql://user:password@localhost:3306/dbname"
    EMAIL_RESET_TOKEN_EXPIRE_HOURS:int = 1
    URL:str = "http://localhost:8000"

    class Config:
        env_file = ".env"

settings = Settings()
