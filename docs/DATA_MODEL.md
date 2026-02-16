# Data Model

## Core Entities
- Patient
- Encounter
- LabResult
- Medication
- DocumentRef
- TimelineEvent

## Relationships
- Patient has many Encounters
- Patient has many LabResults
- Patient has many Medications
- Patient has many DocumentRefs
- TimelineEvent references a source entity by type and id

## Identifiers
- Use string ids for all entities
- No real MRNs or PHI
