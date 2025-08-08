"""
Smart Logger for Backend - Reduces console spam while maintaining debugging value
"""
import time
import json
from typing import Dict, List, Any, Optional
from contextlib import contextmanager
from dataclasses import dataclass, field
from enum import Enum

class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"

@dataclass
class LogEntry:
    level: LogLevel
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: float = field(default_factory=time.time)

@dataclass
class Transaction:
    id: str
    title: str
    context: Dict[str, Any]
    start_time: float
    messages: List[LogEntry] = field(default_factory=list)
    status: str = "active"
    end_time: Optional[float] = None
    result: Optional[Any] = None

class SmartLogger:
    """Intelligent logging system that combines related operations"""
    
    def __init__(self, verbose_mode: bool = False):
        self.verbose_mode = verbose_mode
        self.active_transactions: Dict[str, Transaction] = {}
        self.settings = {
            'enable_grouping': True,
            'enable_transactions': True,
            'enable_summaries': True,
            'transaction_timeout': 5.0,  # 5 seconds
        }
    
    def _get_icon(self, level: LogLevel) -> str:
        """Get emoji icon for log level"""
        icons = {
            LogLevel.DEBUG: "🐛",
            LogLevel.INFO: "ℹ️",
            LogLevel.WARN: "⚠️",
            LogLevel.ERROR: "❌",
            LogLevel.SUCCESS: "✅"
        }
        return icons.get(level, "📝")
    
    def _print_log(self, level: LogLevel, message: str, data: Any = None):
        """Print log message with appropriate formatting"""
        icon = self._get_icon(level)
        log_message = f"{icon} {message}"
        
        if data:
            if isinstance(data, (dict, list)):
                try:
                    data_str = json.dumps(data, indent=2, default=str)
                    print(f"{log_message}\n{data_str}")
                except (TypeError, ValueError):
                    print(f"{log_message} {data}")
            else:
                print(f"{log_message} {data}")
        else:
            print(log_message)
    
    def log(self, level: LogLevel, message: str, data: Any = None):
        """Basic logging method"""
        if self.verbose_mode or level in [LogLevel.ERROR, LogLevel.WARN]:
            self._print_log(level, message, data)
    
    def debug(self, message: str, data: Any = None):
        self.log(LogLevel.DEBUG, message, data)
    
    def info(self, message: str, data: Any = None):
        self.log(LogLevel.INFO, message, data)
    
    def warn(self, message: str, data: Any = None):
        self.log(LogLevel.WARN, message, data)
    
    def error(self, message: str, data: Any = None):
        self.log(LogLevel.ERROR, message, data)
    
    def success(self, message: str, data: Any = None):
        self.log(LogLevel.SUCCESS, message, data)
    
    @contextmanager
    def transaction(self, transaction_id: str, title: str, context: Dict[str, Any] = None):
        """Context manager for transaction logging"""
        context = context or {}
        transaction = Transaction(
            id=transaction_id,
            title=title,
            context=context,
            start_time=time.time()
        )
        
        self.active_transactions[transaction_id] = transaction
        
        if self.verbose_mode:
            print(f"🔄 Starting: {title} {context}")
        
        try:
            yield transaction
            transaction.status = "completed"
            transaction.end_time = time.time()
            self._complete_transaction(transaction, success=True)
        except Exception as e:
            transaction.status = "failed"
            transaction.end_time = time.time()
            transaction.messages.append(
                LogEntry(LogLevel.ERROR, str(e), {"exception": type(e).__name__})
            )
            self._complete_transaction(transaction, success=False)
            raise
        finally:
            if transaction_id in self.active_transactions:
                del self.active_transactions[transaction_id]
    
    def add_to_transaction(self, transaction_id: str, level: LogLevel, message: str, data: Any = None):
        """Add a message to an active transaction"""
        transaction = self.active_transactions.get(transaction_id)
        if not transaction:
            # Fallback to regular logging
            self.log(level, message, data)
            return
        
        entry = LogEntry(level=level, message=message, data=data)
        transaction.messages.append(entry)
        
        # Show individual messages only in verbose mode
        if self.verbose_mode:
            self.log(level, message, data)
    
    def _complete_transaction(self, transaction: Transaction, success: bool):
        """Complete a transaction and show summary"""
        duration = (transaction.end_time - transaction.start_time) * 1000  # Convert to ms
        
        # Count message types
        errors = sum(1 for m in transaction.messages if m.level == LogLevel.ERROR)
        warnings = sum(1 for m in transaction.messages if m.level == LogLevel.WARN)
        
        # Create summary
        status_icon = "✅" if success else "❌"
        summary = f"{status_icon} {transaction.title} ({duration:.1f}ms)"
        
        if transaction.context:
            context_str = ", ".join(f"{k}:{v}" for k, v in transaction.context.items())
            summary += f" [{context_str}]"
        
        if errors > 0 or warnings > 0:
            summary += f" - {errors} errors, {warnings} warnings"
        
        # Always show summary
        print(summary)
        
        # Show details if there were issues or in verbose mode
        if (errors > 0 or warnings > 0 or self.verbose_mode) and transaction.messages:
            print("📋 Details:")
            for msg in transaction.messages:
                icon = self._get_icon(msg.level)
                if msg.data:
                    print(f"  {icon} {msg.message} {msg.data}")
                else:
                    print(f"  {icon} {msg.message}")
    
    def tile_operation(self, action: str, tile_id: int, user_id: int = None):
        """Context manager for tile operations"""
        transaction_id = f"tile_{action}_{tile_id}_{int(time.time())}"
        context = {"action": action, "tile_id": tile_id}
        if user_id:
            context["user_id"] = user_id
        
        return self.transaction(transaction_id, f"Tile {action}", context)
    
    def canvas_operation(self, action: str, canvas_id: int, user_id: int = None):
        """Context manager for canvas operations"""
        transaction_id = f"canvas_{action}_{canvas_id}_{int(time.time())}"
        context = {"action": action, "canvas_id": canvas_id}
        if user_id:
            context["user_id"] = user_id
        
        return self.transaction(transaction_id, f"Canvas {action}", context)
    
    def lock_operation(self, action: str, tile_id: int, user_id: int):
        """Context manager for lock operations"""
        transaction_id = f"lock_{action}_{tile_id}_{user_id}_{int(time.time())}"
        context = {"action": action, "tile_id": tile_id, "user_id": user_id}
        
        return self.transaction(transaction_id, f"Lock {action}", context)
    
    def enable_verbose_mode(self):
        """Enable verbose mode for detailed debugging"""
        self.verbose_mode = True
        print("🔍 Smart Logger: Verbose mode enabled")
    
    def disable_verbose_mode(self):
        """Disable verbose mode for cleaner output"""
        self.verbose_mode = False
        print("🔇 Smart Logger: Verbose mode disabled")

# Create global instance
smart_logger = SmartLogger(verbose_mode=False)

# Convenience functions
def tile_operation(action: str, tile_id: int, user_id: int = None):
    return smart_logger.tile_operation(action, tile_id, user_id)

def canvas_operation(action: str, canvas_id: int, user_id: int = None):
    return smart_logger.canvas_operation(action, canvas_id, user_id)

def lock_operation(action: str, tile_id: int, user_id: int):
    return smart_logger.lock_operation(action, tile_id, user_id)

def log_info(message: str, data: Any = None):
    smart_logger.info(message, data)

def log_error(message: str, data: Any = None):
    smart_logger.error(message, data)

def log_success(message: str, data: Any = None):
    smart_logger.success(message, data)

def enable_verbose():
    smart_logger.enable_verbose_mode()

def disable_verbose():
    smart_logger.disable_verbose_mode()
