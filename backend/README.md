### Setup Instructions:

To initialize the project first install uv:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh # MacOS
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex" # Windows
```

You can use pkgx as well if you have it installed

```
pkgx uv sync
```
then sync the project dependencies with:

```bash
uv sync
```
Create and activate the environment

```
source .venv/bin/activate
```

### Design Decisions Made

- Lightweight project, not relying on too many dependencies
- Simple API with good error handling
- PDF parsing to MD for easier interaction with the llm
