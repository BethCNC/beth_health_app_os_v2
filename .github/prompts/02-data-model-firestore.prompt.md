Use dummy data only.

When defining data models:
- Put types in src/lib/domain
- Keep ids as strings
- Include core entities: Patient, Encounter, LabResult, Medication, DocumentRef, TimelineEvent

Firestore integration (later):
- Implement only in src/lib/data
- UI consumes safe DTOs
