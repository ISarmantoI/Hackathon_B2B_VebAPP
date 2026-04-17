import asyncio

from app.core.config import get_settings
from app.services.seed import seed_initial_data


async def main() -> None:
    await seed_initial_data(get_settings())


if __name__ == "__main__":
    asyncio.run(main())
