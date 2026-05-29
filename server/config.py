from pathlib import Path

from pydantic_settings import BaseSettings

# .env 在项目根目录（server/ 的上一级）
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    # 讯飞语音
    xf_app_id: str = ""
    xf_api_key: str = ""
    xf_api_secret: str = ""

    # DeepSeek NLU
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"

    # 服务
    server_host: str = "0.0.0.0"
    server_port: int = 8000

    model_config = {"env_file": str(_ENV_FILE), "env_file_encoding": "utf-8"}


settings = Settings()
