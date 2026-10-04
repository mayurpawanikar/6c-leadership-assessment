import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupportingDocumentService } from "../services/supporting-document-service";
import type { SupportingDocument } from "../models/supporting-document-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all SupportingDocument records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, supportingDocumentName, auditActionKey, auditTimestamp, filename, fileTypeKey, supportingDocumentNote, supportingDocumentTypeKey, supportingDocumentURL, uploadedDate, uploaderEmail, uploaderName, uploaderRoleKey, visibilityKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useSupportingDocumentList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["supportingDocument-list", options],
    queryFn: () => SupportingDocumentService.getAll(options),
  });
}

/**
 * Retrieve a single SupportingDocument record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useSupportingDocument(id: string) {
  return useQuery({
    queryKey: ["supportingDocument", id],
    queryFn: () => SupportingDocumentService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new SupportingDocument record.
 * @remarks Form validation: use CreateSupportingDocumentSchema with zodResolver for type-safe create forms
 */
export function useCreateSupportingDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SupportingDocument, "id">) => SupportingDocumentService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["supportingDocument-list"] });
    },
  });
}

/**
 * Update an existing SupportingDocument record.
 * @remarks Form validation: use UpdateSupportingDocumentSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateSupportingDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<SupportingDocument, "id">>;
    }) => SupportingDocumentService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["supportingDocument-list"] });
      client.invalidateQueries({ queryKey: ["supportingDocument", variables.id] });
    },
  });
}

/**
 * Delete a SupportingDocument record by its unique identifier.
 */
export function useDeleteSupportingDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SupportingDocumentService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["supportingDocument-list"] });
      client.invalidateQueries({ queryKey: ["supportingDocument", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const SupportingDocument_DATA_SOURCE_TYPE = 'InMemory' as const;

export { SupportingDocumentSchema, CreateSupportingDocumentSchema, UpdateSupportingDocumentSchema } from "../validators/supporting-document-validator";
export type { SupportingDocumentInput, CreateSupportingDocumentInput, UpdateSupportingDocumentInput } from "../validators/supporting-document-validator";