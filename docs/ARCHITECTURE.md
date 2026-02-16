# Architecture

## Stack
- Next.js App Router + TypeScript
- Firestore as system of record (later), accessed only via src/lib/data

## Layering Rules
- UI components never call Firestore directly
- Domain types and schemas live in src/lib/domain
- Data access lives in src/lib/data

## App Structure
- src/app for App Router pages and layouts
- src/components for shared UI components
- src/lib/domain for types and schemas
- src/lib/data for data access and adapters

## Dummy Data Policy
- Use dummy data only
- Never log full medical records
