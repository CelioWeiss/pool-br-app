'use server';

/**
 * @fileoverview A Genkit flow for uploading an image to an external service.
 *
 * - uploadImage - A function that handles the image upload process.
 * - UploadImageInput - The input type for the uploadImage function.
 * - UploadImageOutput - The return type for the uploadImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';

const UploadImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A base64 encoded image data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type UploadImageInput = z.infer<typeof UploadImageInputSchema>;

const UploadImageOutputSchema = z.object({
  imageUrl: z.string().url().describe('The direct URL of the uploaded image.'),
});
export type UploadImageOutput = z.infer<typeof UploadImageOutputSchema>;

export async function uploadImage(
  input: UploadImageInput
): Promise<UploadImageOutput> {
  return uploadImageFlow(input);
}

async function uploadImageToPostimages(
  base64Image: string
): Promise<string> {
  const form = new FormData();
  form.append('token', '19a48ae66735528347f35e893e43a9a83852e6f4'); 
  
  // The API expects the base64 string directly, not as a file/blob
  form.append('upload', base64Image);

  const response = await fetch('https://api.postimages.org/1/upload', {
    method: 'POST',
    body: form as any, // Cast to any to handle type mismatch with Node's fetch
    headers: form.getHeaders(), // Use getHeaders() from form-data package
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to upload image: ${response.statusText} - ${errorBody}`
    );
  }

  const result = await response.json();
  if (result.status !== 'OK' || !result.data?.url) {
    throw new Error(`Postimages API error: ${JSON.stringify(result)}`);
  }

  return result.data.url;
}

const uploadImageFlow = ai.defineFlow(
  {
    name: 'uploadImageFlow',
    inputSchema: UploadImageInputSchema,
    outputSchema: UploadImageOutputSchema,
  },
  async ({ imageDataUri }) => {
    const base64Data = imageDataUri.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid Data URI format.');
    }

    const imageUrl = await uploadImageToPostimages(base64Data);

    return { imageUrl };
  }
);
