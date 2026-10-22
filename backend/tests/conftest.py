import os
import sys
import tempfile

import pytest

# Use a throwaway database so tests never touch the real cybershield_local.db.
# Must be set before any backend module is imported.
_tmpdir = tempfile.mkdtemp(prefix="cybershield-test-")
os.environ["CYBERSHIELD_DB_PATH"] = os.path.join(_tmpdir, "test.db")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    from main import app
    app.state.limiter.reset()
    yield
