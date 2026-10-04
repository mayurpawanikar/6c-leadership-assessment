import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AssessmentService } from "../services/assessment-service";
import type { Assessment } from "../models/assessment-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Assessment records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, assessmentName, aIReport, createdDate, finalReport, latestFlag, statusKey, submittedDate, versionNumber
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useAssessmentList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["assessment-list", options],
    queryFn: () => AssessmentService.getAll(options),
  });
}

/**
 * Retrieve a single Assessment record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useAssessment(id: string) {
  return useQuery({
    queryKey: ["assessment", id],
    queryFn: () => AssessmentService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Assessment record.
 * @remarks Form validation: use CreateAssessmentSchema with zodResolver for type-safe create forms
 */
export function useCreateAssessment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Assessment, "id">) => AssessmentService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["assessment-list"] });
    },
  });
}

/**
 * Update an existing Assessment record.
 * @remarks Form validation: use UpdateAssessmentSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateAssessment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Assessment, "id">>;
    }) => AssessmentService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["assessment-list"] });
      client.invalidateQueries({ queryKey: ["assessment", variables.id] });
    },
  });
}

/**
 * Delete a Assessment record by its unique identifier.
 */
export function useDeleteAssessment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AssessmentService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["assessment-list"] });
      client.invalidateQueries({ queryKey: ["assessment", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Assessment_DATA_SOURCE_TYPE = 'InMemory' as const;

export { AssessmentSchema, CreateAssessmentSchema, UpdateAssessmentSchema } from "../validators/assessment-validator";
export type { AssessmentInput, CreateAssessmentInput, UpdateAssessmentInput } from "../validators/assessment-validator";