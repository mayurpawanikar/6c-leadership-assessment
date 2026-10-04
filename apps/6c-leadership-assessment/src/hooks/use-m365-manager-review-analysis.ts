import { useMutation } from '@tanstack/react-query';
import { copilotChat } from '../../app-gen-sdk/data/workiq/m365-mcp-clients';

export interface ManagerReviewAnalysis {
  executiveSummary: string;
  strengths: string;
  employeeGaps: string;
  alignmentAnalysis: string;
  developmentFocus: string;
  coachingActions: string;
}

export interface ManagerReviewAnalysisInput {
  employeeName: string;
  jobTitle: string;
  overallManagerRating: string;
  overallManagerComment: string;
  ratingComparison: string;
  managerSupportingDocument: string;
}

const responseSchema = {
  executiveSummary: 'string',
  strengths: 'string',
  employeeGaps: 'string',
  alignmentAnalysis: 'string',
  developmentFocus: 'string',
  coachingActions: 'string',
} as const;

export const useManagerReviewAnalysis = () => {
  return useMutation({
    mutationFn: async (input: ManagerReviewAnalysisInput): Promise<ManagerReviewAnalysis> => {
      const message = `Analyze the completed 6C leadership manager review for ${input.employeeName}, whose role is ${input.jobTitle}. Use only the assessment information included below. Do not search the web, infer protected characteristics, rank the employee against colleagues, or make an employment or promotion decision.

Overall manager rating: ${input.overallManagerRating}
Overall manager rationale: ${input.overallManagerComment || 'No overall rationale provided.'}
Employee versus manager rating comparison by dimension:
${input.ratingComparison}
Manager supporting document by dimension:
${input.managerSupportingDocument || 'No dimension comments provided.'}

Return six concise fields. executiveSummary should synthesize the review. strengths should identify three supporting document-based employee strengths as a numbered plain-text list, prioritizing dimensions with high manager ratings and supporting comments. employeeGaps should identify three supporting document-based capability or performance gaps as a numbered plain-text list, prioritizing low manager ratings and material differences between employee and manager ratings; clearly distinguish a rating-perception gap from a demonstrated development gap. alignmentAnalysis should explain the most important rating agreements and differences, including whether the manager rated higher or lower. developmentFocus should identify supporting document-based priorities. coachingActions should provide three practical actions as a numbered plain-text list. Do not invent supporting document. Clearly state that the output is decision support requiring human validation.`;
      const results = await copilotChat<ManagerReviewAnalysis>({ message, responseSchema });
      const analysis = results[0];
      if (!analysis) throw new Error('Copilot did not return a manager review analysis.');
      return analysis;
    },
  });
};
