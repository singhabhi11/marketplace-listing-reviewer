import { z } from 'zod';

export const aiFindingSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  issueCategory: z.enum([
    'UNCLEAR_WORDING',
    'MISLEADING_CLAIM',
    'POLICY_VIOLATION',
    'INCOMPLETE_CONTENT',
    'BRAND_TONE',
    'UNVERIFIABLE_ASSUMPTION',
    'SAFETY_COMPLIANCE',
    'FORMAT',
  ]),
  description: z.string().min(5, 'Description is required and must be substantive'),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  policySectionId: z.string().nullable().optional(),
  policyTitle: z.string().nullable().optional(),
  policyExcerpt: z.string().nullable().optional(),
  explanation: z.string().min(5, 'Explanation must justify the finding'),
  suggestedRevision: z.string().nullable().optional(),
  confidence: z.enum(['High', 'Medium', 'Low', 'Uncertain']).default('High'),
  isUnverified: z.boolean().default(false),
});

export const aiReviewOutputSchema = z.object({
  findings: z.array(aiFindingSchema),
  suggestedRevisions: z.record(z.string(), z.string()).optional().default({}),
  summary: z.string().optional().default('Review completed successfully.'),
});
