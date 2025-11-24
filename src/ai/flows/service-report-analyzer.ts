'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing service reports, identifying potential issues or discrepancies with pool standards using AI.
 *
 * - analyzeServiceReport - Analyzes service report data and photos to identify issues.
 * - ServiceReportInput - Input type for the analyzeServiceReport function.
 * - ServiceReportOutput - Output type for the analyzeServiceReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ServiceReportInputSchema = z.object({
  poolParameters: z
    .string()
    .describe('The recorded pool parameters (chlorine, pH, etc.).'),
  servicesPerformed: z.string().describe('The services performed during the visit.'),
  photoDataUri: z
    .string()
    .describe(
      'A photo of the pool, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type ServiceReportInput = z.infer<typeof ServiceReportInputSchema>;

const ServiceReportOutputSchema = z.object({
  analysisResult: z.string().describe('The analysis result of the service report.'),
  issuesIdentified: z.string().describe('Any issues or discrepancies identified.'),
  complianceStatus: z.string().describe('The compliance status of the pool.'),
});
export type ServiceReportOutput = z.infer<typeof ServiceReportOutputSchema>;

export async function analyzeServiceReport(
  input: ServiceReportInput
): Promise<ServiceReportOutput> {
  return analyzeServiceReportFlow(input);
}

const analyzeServiceReportPrompt = ai.definePrompt({
  name: 'analyzeServiceReportPrompt',
  input: {schema: ServiceReportInputSchema},
  output: {schema: ServiceReportOutputSchema},
  prompt: `You are an expert pool maintenance technician.

You will analyze the service report data and photos provided to identify any issues or discrepancies with pool standards.

Based on the analysis, you will determine the compliance status of the pool.

Pool Parameters: {{{poolParameters}}}
Services Performed: {{{servicesPerformed}}}
Photo: {{media url=photoDataUri}}

Analysis Result:
Issues Identified:
Compliance Status:`,
});

const analyzeServiceReportFlow = ai.defineFlow(
  {
    name: 'analyzeServiceReportFlow',
    inputSchema: ServiceReportInputSchema,
    outputSchema: ServiceReportOutputSchema,
  },
  async input => {
    const {output} = await analyzeServiceReportPrompt(input);
    return output!;
  }
);
