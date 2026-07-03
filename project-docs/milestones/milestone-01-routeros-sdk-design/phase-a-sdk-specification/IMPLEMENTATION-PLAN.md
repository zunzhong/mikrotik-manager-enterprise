# Implementation Plan

## Part 03 — Reply Parser

Add:

- `ReplyParser`
- `RouterReply`
- tests for `!re`, `!done`, `!trap`, `!fatal`

## Part 04 — RouterClient Skeleton

Add:

- `RouterClient`
- connection state
- TCP connect/close
- no auth yet

## Part 05 — Authentication

Add:

- modern login
- v6 challenge login
- MD5 challenge response
- auth tests

## Part 06 — Command Pipeline

Add:

- command executor
- tag management
- pending command registry
- timeout
- trap handling

## Part 07 — Fake RouterOS Server

Add:

- integration test server
- test modern login
- test resource command
- test trap response
