import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CorrectionService {
  constructor(private readonly httpService: HttpService) {}

  async callPythonService(text: string, section: string, phase: string, language: string, model: string) {
    let apiUrl;
    if (phase === 'initial') {
      apiUrl = 'http://flask-api:8031/handle-correction';
    } else {
      apiUrl = 'http://flask-api:8031/handle-further-correction';
    }
    const response = await lastValueFrom(this.httpService.post(apiUrl, { text, section, language, model }));
    return response.data;
  }
}
