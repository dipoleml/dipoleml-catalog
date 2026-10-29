from pathlib import Path


def get_repo_version(repo_path: Path) -> str:
    """
    Get Branch name and commit hash of the repository
    """
    import subprocess
    from subprocess import CalledProcessError

    try:
        # Check if the path exists and is a directory
        if not repo_path.exists() or not repo_path.is_dir():
            return "unknown"

        # Check if it's a git repository
        try:
            subprocess.run(
                ["git", "rev-parse", "--is-inside-work-tree"],
                cwd=repo_path,
                check=True,
                capture_output=True,
            )
        except CalledProcessError:
            return "unknown"

        # Get current branch name
        branch = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=repo_path,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        # Get current commit hash
        commit = subprocess.run(
            ["git", "rev-parse", "--short=8", "HEAD"],
            cwd=repo_path,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        return f"{branch}@{commit}"
    except Exception:
        return "unknown"
