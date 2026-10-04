import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CampaignService } from "../services/campaign-service";
import type { Campaign } from "../models/campaign-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Campaign records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, campaignName, archivedDate, campaignTypeKey, createdDate, description, endDate, frameworkVersion, startDate, statusKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useCampaignList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["campaign-list", options],
    queryFn: () => CampaignService.getAll(options),
  });
}

/**
 * Retrieve a single Campaign record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: () => CampaignService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Campaign record.
 * @remarks Form validation: use CreateCampaignSchema with zodResolver for type-safe create forms
 */
export function useCreateCampaign() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Campaign, "id">) => CampaignService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["campaign-list"] });
    },
  });
}

/**
 * Update an existing Campaign record.
 * @remarks Form validation: use UpdateCampaignSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateCampaign() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Campaign, "id">>;
    }) => CampaignService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["campaign-list"] });
      client.invalidateQueries({ queryKey: ["campaign", variables.id] });
    },
  });
}

/**
 * Delete a Campaign record by its unique identifier.
 */
export function useDeleteCampaign() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CampaignService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["campaign-list"] });
      client.invalidateQueries({ queryKey: ["campaign", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Campaign_DATA_SOURCE_TYPE = 'InMemory' as const;

export { CampaignSchema, CreateCampaignSchema, UpdateCampaignSchema } from "../validators/campaign-validator";
export type { CampaignInput, CreateCampaignInput, UpdateCampaignInput } from "../validators/campaign-validator";