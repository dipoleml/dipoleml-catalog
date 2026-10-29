import asyncio
import os
from typing import Awaitable, Callable, List, TypeVar

from utils import Logger

T = TypeVar("T")


class WorkerPool:
    """
    A worker pool for running async tasks with controlled concurrency.

    The pool uses a semaphore to limit the number of concurrent workers executing tasks.
    This prevents overwhelming system resources or API rate limits when running many tasks.

    Example:
        >>> async def my_task(x: int) -> int:
        ...     await asyncio.sleep(1)
        ...     return x * 2
        >>>
        >>> pool = WorkerPool(max_workers=2)
        >>> tasks = [lambda: my_task(i) for i in range(5)]
        >>> results = await pool.run(tasks)
    """

    def __init__(self, max_workers: int = 0):
        """
        Initialize a worker pool with a specified number of concurrent workers.

        Args:
            max_workers: Maximum number of concurrent workers. If 0 or negative,
                         defaults to the number of CPU cores available.
        """
        if max_workers <= 0:
            max_workers = os.cpu_count() or 1

        self.max_workers = max_workers
        self._semaphore = asyncio.Semaphore(max_workers)

        Logger.info(f"Worker pool initialized with {max_workers} max workers")

    async def _run_with_semaphore(self, task: Callable[[], Awaitable[T]]) -> T:
        """
        Run a single task with semaphore-based concurrency control.

        Args:
            task: An async callable that returns an awaitable result

        Returns:
            The result of the task execution
        """
        async with self._semaphore:
            return await task()

    async def run(self, tasks: List[Callable[[], Awaitable[T]]]) -> List[T | Exception]:
        """
        Run multiple tasks concurrently with controlled concurrency.

        Tasks are executed with a maximum of max_workers running at any given time.
        If a task raises an exception, it is captured and returned in the results list.

        Args:
            tasks: A list of async callables to execute

        Returns:
            A list of results or exceptions, in the same order as the input tasks
        """
        Logger.debug(f"Running {len(tasks)} tasks with {self.max_workers} max workers")

        # Wrap each task with semaphore control
        wrapped_tasks = [self._run_with_semaphore(task) for task in tasks]

        # Run all tasks concurrently, capturing exceptions
        results = await asyncio.gather(*wrapped_tasks, return_exceptions=True)

        Logger.debug(f"All {len(tasks)} tasks completed")

        return results
