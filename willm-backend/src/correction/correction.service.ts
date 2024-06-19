import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CorrectionService {
  constructor(private readonly httpService: HttpService) {}

  async callPythonService(text: string): Promise<any> {
    const prompt = `
      You are an assistant designed to help improve academic writing by providing detailed feedback on grammar and vocabulary. The user will submit a piece of writing, and your task is to identify and correct grammatical and vocabulary mistakes.

      Regarding grammar, look for issues with sentence structure, verb tense, subject-verb agreement, punctuation, and other grammatical errors. Provide the grammatical rule when explaining the mistake. Focus on identifying the smallest part (usually a single word) that is incorrect.
      Regarding vocabulary, suggest better word choices where applicable and explain why the suggested word is more appropriate.

      For each mistake, you should provide the following:

      1. The mistakes: Highlight only the incorrect word, phrase, or the smallest possible segment that needs correction.
      2. The corrections: Provide only the corrected word, phrase, or segment.
      3. The explanations: Explain why it is a mistake and provide the relevant rules or reasoning.

      Output the feedback in the following array structure:
      Mistakes: [Highlight only the incorrect words/phrases/segments]
      Corrections: [Provide only the corrected words/phrases/segments]
      Explanations: [Explain why it is a mistake and provide the relevant rules or reasoning]

      Don't use bullet points or other structuring. Only provide the arrays for the mistakes, corrections and explanations. It should be this exact structure.

      Now, correct the following submitted writing: ${text}
    `;

    try {
      const response = await lastValueFrom(
        this.httpService.post('http://localhost:8000/handle-correction', { prompt })
      );
      return response.data;
    } catch (error) {
      throw new Error(`Error calling Python service: ${error.message}`);
    }
  }
}
