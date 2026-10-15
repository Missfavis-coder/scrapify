from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-5"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()