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
import axios from 'axios';
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
  // The Postimages API token and the field name 'upload'
  form.append('token', '19a48ae66735528347f35e893e43a9a83852e6f4'); 
  form.append('upload', base64Image);

  try {
    const response = await axios.post(
      'https://api.postimages.org/1/upload',
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000, // 30 second timeout
      }
    );

    const result = response.data;
    if (result.status !== 'OK' || !result.data?.url) {
      throw new Error(`Postimages API error: ${JSON.stringify(result)}`);
    }

    return result.data.url;
  } catch (error: any) {
    // Axios wraps the response error in `error.response`
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `Failed to upload image: ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}`
      );
    }
    // Handle other errors (network, timeout, etc.)
    throw new Error(`Failed to upload image: ${error.message}`);
  }
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
