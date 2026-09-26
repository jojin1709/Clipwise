# Security Model

ShowcaseAI is a website demonstration tool. It is not designed to bypass authentication or security controls.

## Default protections

- HTTP(S) only
- localhost/private IP targets blocked
- same-origin navigation
- crawl depth and page count limits
- no arbitrary LLM JavaScript
- no destructive actions
- no payment actions
- no credential extraction
- no automatic auth bypass

## Before public release

Add a robust DNS rebinding defense that resolves and validates every navigation target immediately before navigation, and consider an explicit allowlist for private-network testing in a future advanced mode.
