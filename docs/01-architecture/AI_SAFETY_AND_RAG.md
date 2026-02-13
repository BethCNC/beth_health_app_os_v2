Source of truth for: AI assistant constraints, grounding strategy, and refusal policy.
Do not duplicate: General product metrics or unrelated endpoint behavior.

# AI Safety and RAG

## AI Scope (v1)
- Evidence-only Q&A from ingested records.
- Must return citations and confidence.
- Must refuse diagnosis/treatment/prescription advice.

## Grounding Rules
- Prefer verified data.
- If pending data is included, label it explicitly as pending verification.
- Never output uncited clinical claims.

## Refusal Triggers
- Questions requesting diagnosis, treatment plans, medication dosing, or prescribing.

## Output Contract
- `answer`
- `confidence`
- `grounded`
- `citations[]`
- `refusalReason` when applicable

## Evaluation Checks
- Citation presence and relevance.
- Confidence calibration against available evidence.
- Hallucination guard checks before response emission.
