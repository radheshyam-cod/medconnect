// FHIR resource type mapping
export const FHIR_RESOURCE_TYPES = [
  "Patient",
  "Observation",
  "MedicationRequest",
  "Medication",
  "Condition",
  "Encounter",
  "Procedure",
  "Immunization",
  "AllergyIntolerance",
  "DiagnosticReport",
  "ImagingStudy",
  "DocumentReference",
  "Practitioner",
  "Organization",
  "Composition",
] as const;

export type FhirResourceType = (typeof FHIR_RESOURCE_TYPES)[number];

// Simplified FHIR resource parser
export function parseFhirResource(resource: any) {
  if (!resource || !resource.resourceType) {
    throw new Error("Invalid FHIR resource: missing resourceType");
  }

  return {
    resourceType: resource.resourceType,
    id: resource.id,
    meta: resource.meta,
    ...resource,
  };
}

// Extract key dates from various FHIR resource types
export function extractFhirDate(resource: any): string | null {
  if (!resource) return null;

  switch (resource.resourceType) {
    case "Observation":
      return resource.effectiveDateTime || resource.issued || null;
    case "MedicationRequest":
      return resource.authoredOn || null;
    case "Condition":
      return resource.onsetDateTime || resource.recordedDate || null;
    case "Encounter":
      return resource.period?.start || null;
    case "Procedure":
      return resource.performedDateTime || resource.performedPeriod?.start || null;
    case "Immunization":
      return resource.occurrenceDateTime || null;
    case "DiagnosticReport":
      return resource.effectiveDateTime || resource.issued || null;
    default:
      return resource.meta?.lastUpdated || null;
  }
}

// Extract a display title from a FHIR resource
export function extractFhirTitle(resource: any): string {
  if (!resource) return "Unknown";

  switch (resource.resourceType) {
    case "Patient":
      return resource.name?.[0]?.text ||
        [resource.name?.[0]?.given?.join(" "), resource.name?.[0]?.family].filter(Boolean).join(" ") ||
        "Unknown Patient";
    case "Observation":
      return resource.code?.text || resource.code?.coding?.[0]?.display || "Observation";
    case "Condition":
      return resource.code?.text || resource.code?.coding?.[0]?.display || "Condition";
    case "MedicationRequest":
      return resource.medicationCodeableConcept?.text ||
        resource.medicationCodeableConcept?.coding?.[0]?.display ||
        resource.medicationReference?.display ||
        "Medication";
    case "Encounter":
      return resource.type?.[0]?.text ||
        resource.type?.[0]?.coding?.[0]?.display ||
        "Encounter";
    case "Procedure":
      return resource.code?.text || resource.code?.coding?.[0]?.display || "Procedure";
    default:
      return resource.code?.text || resource.name?.text || resource.resourceType || "Unknown";
  }
}

// Map FHIR resource types to our internal TimelineEventType
export function mapFhirToTimelineType(resourceType: string): string {
  const mapping: Record<string, string> = {
    Observation: "LAB_TEST",
    Condition: "DIAGNOSIS",
    Encounter: "VISIT",
    Procedure: "PROCEDURE",
    MedicationRequest: "MEDICATION",
    Immunization: "VACCINATION",
    AllergyIntolerance: "ALLERGY",
    DiagnosticReport: "LAB_TEST",
    ImagingStudy: "IMAGING",
  };

  return mapping[resourceType] || "OTHER";
}
