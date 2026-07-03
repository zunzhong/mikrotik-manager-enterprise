# Configuration Explorer

## Goal

Configuration Explorer is a WinBox-like configuration browser and editor.

## Features

```txt
Configuration Explorer
├── Full RouterOS Config Tree
├── Global Search
├── Read-only Explorer Mode
├── Edit Mode
├── Diff Before Apply
├── Change Preview
├── Apply Changes
├── Rollback
├── Compare Devices
└── Audit Log
```

## Design Principles

- Read operations first.
- Write operations require confirmation.
- All changes must be auditable.
- Risky operations must support pre-change backup.
- Future AI Assistant can explain config differences.
