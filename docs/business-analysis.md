# OTCMS — Business Analysis & Implementation Plan
## Oromo Traditional Court Management System — Bale Robe City, Oromia

> **Legal basis:** Oromia Regional State Proclamation No. 240/2021 (Customary Court Establishment & Recognition); Regulation No. 10/2021.
> Requirements marked **[PRACTICE — VERIFY]** are based on general Oromo customary practice and require confirmation with the Bale Robe Traditional Court before automated enforcement.

---

## 1. Manual Workflow Analysis (AS-IS)

| Step | Manual Activity | Actor | Record |
|---|---|---|---|
| 1 | Plaintiff submits oral/written complaint | Plaintiff / Secretary | Complaint register |
| 2 | Secretary registers case, assigns hand-written number | Record Officer | Case register book |
| 3 | Preliminary examination: jurisdiction & completeness check | Court Manager / Secretary | Review notes |
| 4 | Court issues written summons to defendant | Secretary | Summons log |
| 5 | Defendant appears; oral/written consent recorded | Court Manager / Secretary | Consent register |
| 6 | Jaarsa Biyyaa elders selected; hearing date fixed | Court Manager / Secretary | Assignment record |
| 7 | First hearing: both parties heard by elder panel | Elder panel | Hearing minutes |
| 8 | Witnesses examined; evidence presented | Elder panel / Secretary | Witness register |
| 9 | Elders guide Jaarsummaa (reconciliation) | Elder panel | Reconciliation notes |
| 10 | If agreed: reconciliation agreement drafted & signed | Secretary / Elder panel | Agreement document |
| 11 | If no agreement: elder panel deliberates, issues ruling | Elder panel | Decision document |
| 12 | Secretary records decision; issues certified copies | Secretary | Decision register |
| 13 | Implementation monitored; case closed | Court Manager | Closure record |
| 14 | Party may appeal to Woreda Appellate Court; file transferred | Secretary / Court Manager | Appeal record |

### Known pain points in the manual system
- No duplicate case detection
- Physical files lost or damaged
- No systematic summons tracking
- Inconsistent consent recording
- Elder participation not formally tracked
- No conflict-of-interest mechanism for elders
- Appeal records separated from original case file

---

## 2. Business Rules

### BR-CR — Case Registration
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-CR-001 | Unique system-generated case number: `OTCMS-{YYYY}-{NNNN}` | System | Internal |
| BR-CR-002 | Both parties must be registered and verified community members | Record Officer | Proclamation 240/2021 Art. 12 |
| BR-CR-003 | Complainant and respondent must be different persons | System | Logical |
| BR-CR-004 | Case description must be provided (min 10 characters) | Record Officer | Internal |
| BR-CR-005 | Case type must be selected from approved list | Record Officer | Proclamation 240/2021 Art. 8 |
| BR-CR-006 | Cases involving minors require special handling **[PRACTICE — VERIFY]** | Court Manager | Local practice |
| BR-CR-007 | System warns if same parties have open case of same type | System | Integrity |

### BR-JR — Jurisdiction
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-JR-001 | Court has jurisdiction over civil disputes between community members in its territorial area | Court Manager | Proclamation 240/2021 Art. 6–9 |
| BR-JR-002 | Court does NOT have jurisdiction over: criminal matters, disputes involving government entities, cases where one party does not consent | Court Manager | Proclamation 240/2021 Art. 8 |
| BR-JR-003 | Jurisdiction basis must be recorded before case advances past SUBMITTED | Court Manager | Proclamation 240/2021 Art. 10 |
| BR-JR-004 | Out-of-jurisdiction cases must be transferred; transfer record kept | Record Officer | Proclamation 240/2021 Art. 11 |

### BR-SC — Summons & Consent
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-SC-001 | Summons issued to respondent within **[VERIFY period]** of case acceptance | Record Officer | Proclamation 240/2021 Art. 14 |
| BR-SC-002 | Summons must state: case number, complainant, dispute nature, hearing date/time/location, right to be heard | Record Officer | Proclamation 240/2021 Art. 14 |
| BR-SC-003 | Summons service must be recorded: method, date served, name of recipient | Record Officer | Evidentiary |
| BR-SC-004 | Failure to appear after three proper summons — proceed in absentia **[VERIFY number]** | Court Manager | Local practice |
| BR-SC-005 | Both parties must give explicit consent before case advances past UNDER_REVIEW | Court Manager | Proclamation 240/2021 Art. 13 |
| BR-SC-006 | Consent withdrawal moves case to WITHDRAWN; parties notified | System | Proclamation 240/2021 Art. 13 |

### BR-EP — Elder Panel
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-EP-001 | Minimum **[VERIFY: 3 or 5]** elders must be assigned before ASSIGNED status | Court Manager | Proclamation 240/2021 Art. 16 |
| BR-EP-002 | One elder designated as Lead Elder (Abbaa Seeraa / Chair) | Court Manager | Proclamation 240/2021 Art. 16 |
| BR-EP-003 | Elders must not have personal interest or close family relation with parties **[PRACTICE — VERIFY]** | Court Manager | Fairness principle |
| BR-EP-004 | Elder names and roles recorded in system for every case | Record Officer | Accountability |
| BR-EP-005 | Elders do NOT require individual login accounts | Record Officer | Design decision |

### BR-HE — Hearings
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-HE-001 | Every hearing must be associated with an existing open case | System | Integrity |
| BR-HE-002 | Hearing cannot be scheduled unless case is ASSIGNED or later | System | Workflow |
| BR-HE-003 | Hearing must not overlap with another at the same location | System | Operational |
| BR-HE-004 | At least 48 hours notice to parties before hearing **[VERIFY]** | Record Officer | Due process |
| BR-HE-005 | Attendance of all parties, elders, and witnesses recorded per hearing | Record Officer | Accountability |
| BR-HE-006 | If respondent fails to appear, Court Manager must record decision to postpone or proceed | Court Manager | Local practice |
| BR-HE-007 | Hearing notes/minutes recorded and linked to hearing record | Record Officer | Record-keeping |

### BR-WE — Witnesses & Evidence
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-WE-001 | MARRIAGE and DIVORCE cases require min. 2 witness testimonies before UNDER_REVIEW → VERIFIED | System (enforced) | Existing rule |
| BR-WE-002 | Each witness identified by name; linked to community member where possible | Record Officer | Identity |
| BR-WE-003 | Testimony summaries recorded | Record Officer | Record-keeping |
| BR-WE-004 | Physical evidence referenced as Document category = EVIDENCE | Record Officer | Record-keeping |
| BR-WE-005 | Witness tampering allegations recorded and referred to formal court **[PRACTICE — VERIFY]** | Court Manager | General principle |

### BR-RC — Reconciliation
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-RC-001 | Elder panel must attempt Jaarsummaa before issuing a ruling | Elder panel / CM | Proclamation 240/2021 Art. 18 |
| BR-RC-002 | If parties agree, a Reconciliation Agreement must be drafted | Record Officer | Proclamation 240/2021 Art. 19 |
| BR-RC-003 | Agreement must specify: terms, obligations per party, compliance deadline, witnesses | Record Officer | Legal enforceability |
| BR-RC-004 | Reconciliation outcome recorded as Decision type = RECONCILIATION | Record Officer | Distinction required |
| BR-RC-005 | Agreement may be submitted to Woreda Court for enforcement **[VERIFY]** | Court Manager | Proclamation 240/2021 Art. 20 |

### BR-DC — Decisions
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-DC-001 | Decision may only be recorded when case is DECISION_PENDING | System | Workflow |
| BR-DC-002 | Decision must include: case, date, type (RECONCILIATION or RULING), description, Lead Elder | Record Officer | Record-keeping |
| BR-DC-003 | Decisions require approval from required number of panel elders before finalization | System | Proclamation 240/2021 Art. 17 |
| BR-DC-004 | Finalized decision cannot be modified — only reviewed via appeal | System | Legal integrity |
| BR-DC-005 | Certified copies of decision issued to both parties (uploaded as Document) | Record Officer | Proclamation 240/2021 Art. 19 |

### BR-AP — Appeals
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-AP-001 | Party may appeal within **[VERIFY: likely 15–30 days]** of decision notification | Parties | Proclamation 240/2021 Art. 22 |
| BR-AP-002 | Appeal must be in writing and linked to original case | Record Officer | Proclamation 240/2021 Art. 22 |
| BR-AP-003 | On appeal filing, case → APPEALED; original decision locked | System | Workflow |
| BR-AP-004 | Complete case file transferred to Woreda/Zone Appellate Customary Court | Record Officer | Proclamation 240/2021 Art. 23 |
| BR-AP-005 | Appellate outcome recorded when received and linked to original case | Record Officer | Complete record |

### BR-CL — Case Closure & Archival
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-CL-001 | Case may only close after finalized decision confirmed implemented, or after withdrawal | Court Manager | Workflow |
| BR-CL-002 | Closed cases archived; never deleted | System | Legal retention |
| BR-CL-003 | Retention period: **[VERIFY — likely 10 years]** | Admin | Record policy |

### BR-CA — Confidentiality & Access
| ID | Rule | Responsible | Basis |
|---|---|---|---|
| BR-CA-001 | Case info accessible only to: parties, assigned staff, court staff, authorized admins | System (RBAC) | Privacy |
| BR-CA-002 | Community members view only their own cases | System | Existing rule |
| BR-CA-003 | Audit logs accessible only to Administrators | System | Existing rule |
| BR-CA-004 | Finalized decisions become public court record **[VERIFY local policy]** | Court Manager | Transparency |

**Total business rules: 51 across 11 categories.**

---

## 3. Database Gap Analysis

### Models to ADD
| Model | Key Fields |
|---|---|
| `Summons` | caseId, respondentId, issuedAt, issuedByUserId, serviceMethod, servedAt, servedToName, attemptNumber |
| `ConsentRecord` | caseId, communityMemberId, consentGiven, consentDate, recordedByUserId, withdrawnAt |
| `Appeal` | caseId, filedAt, filedByUserId, groundsForAppeal, appellateCourtName, transferredAt, outcome |

### Fields to ADD to existing models
| Model | Field | Purpose |
|---|---|---|
| `Case` | `jurisdictionBasis` VARCHAR(500) | Why court accepted/declined jurisdiction |
| `Case` | `jurisdictionVerifiedAt`, `jurisdictionVerifiedByUserId` | Accountability |
| `Decision` | `decisionType` ENUM(RECONCILIATION, RULING) | Distinguish outcomes |
| `HearingParticipant` | `attendedAt` DateTime | Attendance timestamp |
| `HearingParticipant` | `absenceReason` VARCHAR(255) | Absence tracking |
| `CaseAssignment` | `conflictDeclared` Boolean | Elder conflict-of-interest |

---

## 4. Implementation Priority

| Priority | Feature | Effort |
|---|---|---|
| P1 | `ConsentRecord` model + backend + UI | Medium |
| P1 | `Summons` model + backend + UI | Medium |
| P1 | `Decision.decisionType` enum + UI update | Low |
| P2 | `Appeal` model + backend + UI | Medium |
| P2 | `Case.jurisdictionBasis` field + UI | Low |
| P2 | `HearingParticipant` attendance improvements | Low |
| P3 | Duplicate case warning | Low |
| P3 | `CaseAssignment.conflictDeclared` | Low |

---

## 5. Questions Requiring Court Confirmation

1. Minimum number of elders per panel (3 or 5)?
2. Consent format — verbal before Secretary, or signed written form?
3. Summons response period in days before default applies?
4. Standard reconciliation agreement template?
5. Appeal deadline in days?
6. Jurisdiction — documented on every case, or only when challenged?
7. Minor-case procedure?
8. Elder conflict-of-interest — formal declaration mechanism?

---

*Version 1.0 — October 2026. Awaiting stakeholder confirmation of [VERIFY] items before code implementation.*
