import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, model_validator


def resolve_default_config_path(repo_path: Path) -> Optional[Path]:
    """
    Resolve the default config file path based on repo path.
    Returns the path to an existing config file in the repository if found.
    """
    if not repo_path:
        return None

    # Check for config in repo/.ai/config.yaml
    default_config_path = repo_path / ".ai" / "config.yaml"
    if os.path.exists(default_config_path):
        return default_config_path

    # Also check for .yml extension
    default_config_path = repo_path / ".ai" / "config.yml"
    if os.path.exists(default_config_path):
        return default_config_path

    return None


class BaseHandlerConfig(BaseModel):
    repo_path: Path = Field(..., description="The path to the repository to analyze")
    config: Optional[str] = Field(
        default=None,
        description="The path to the config file."
        " If not specified, will look for .ai/config.yaml or .ai/config.yml in the repository",
    )

    @model_validator(mode="after")
    def resolve_config_path(self) -> "BaseHandlerConfig":
        """Resolve a config path if not explicitly set."""
        if not self.repo_path.exists():
            raise ValueError(f"repo_path {self.repo_path} does not exist")

        if self.config is None:
            if resolved_path := resolve_default_config_path(self.repo_path):
                self.config = str(resolved_path)

        return self


class AbstractHandler(ABC):
    @abstractmethod
    async def handle(self):
        pass


class BaseHandler(AbstractHandler, ABC):
    def __init__(self, config: BaseHandlerConfig):
        self.config = config

    @abstractmethod
    async def handle(self):
        pass
