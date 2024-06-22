import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CorrectionService {
  constructor(private readonly httpService: HttpService) {}

  async callPythonService(text: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.post('http://localhost:8000/handle-correction', { text })
      );
      return response.data;
    } catch (error) {
      throw new Error(`Error calling Python service: ${error.message}`);
    }
  }
}
