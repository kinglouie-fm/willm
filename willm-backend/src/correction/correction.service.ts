import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class CorrectionService {
  constructor(private readonly httpService: HttpService) {}

  async callPythonService(text: string, phase: string) {
    let apiUrl;
    if (phase === 'initial') {
      apiUrl = 'http://localhost:8000/handle-correction';
    } else {
      apiUrl = 'http://localhost:8000/handle-further-correction';
    }

    const response = await this.httpService.post(apiUrl, { text }).toPromise();
    return response.data;
  }
}
