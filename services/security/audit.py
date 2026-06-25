import logging
import os
from datetime import datetime

# Ensure logs directory exists
log_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../logs'))
os.makedirs(log_dir, exist_ok=True)
audit_log_path = os.path.join(log_dir, 'audit.log')

# Configure the Audit Logger
audit_logger = logging.getLogger("streamora_audit")
audit_logger.setLevel(logging.INFO)

# File handler for append-only logging
fh = logging.FileHandler(audit_log_path, mode='a')
fh.setLevel(logging.INFO)

# Formatting: WHO, WHAT, WHEN, WHERE
formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(name)s | %(message)s')
fh.setFormatter(formatter)
audit_logger.addHandler(fh)

def log_event(who: str, what: str, where: str, details: str = ""):
    """
    Append-only immutable audit log format.
    who: User ID or IP
    what: Action performed (e.g. LOGIN_SUCCESS, UNAUTHORIZED_ACCESS)
    where: Endpoint or Service
    details: Any before/after values or extra context
    """
    msg = f"WHO=[{who}] WHAT=[{what}] WHERE=[{where}] DETAILS=[{details}]"
    audit_logger.info(msg)

def get_recent_logs(limit: int = 100):
    """Retrieve the most recent audit logs for the Admin Dashboard."""
    if not os.path.exists(audit_log_path):
        return []
    with open(audit_log_path, 'r') as f:
        lines = f.readlines()
    return lines[-limit:]
