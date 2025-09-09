import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CreateExampleMongodbDocDto,
  ExampleMongodbDocDto,
} from '@tmdjr/seed-service-nestjs-contracts';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExampleCrudApiService {
  private readonly http = inject(HttpClient);
  // If you have an env token, swap this for that. Keep the trailing slash off.
  private readonly baseUrl = '/api/example-crud/';

  list$(): Observable<ExampleMongodbDocDto[]> {
    return this.http.get<ExampleMongodbDocDto[]>(this.baseUrl);
  }

  getById$(id: string): Observable<ExampleMongodbDocDto> {
    return this.http.get<ExampleMongodbDocDto>(
      `${this.baseUrl}/${id}`
    );
  }

  create$(
    dto: CreateExampleMongodbDocDto
  ): Observable<ExampleMongodbDocDto> {
    return this.http.post<ExampleMongodbDocDto>(this.baseUrl, dto);
  }

  update$(
    id: string,
    patch: Partial<CreateExampleMongodbDocDto>
  ): Observable<ExampleMongodbDocDto> {
    return this.http.patch<ExampleMongodbDocDto>(
      `${this.baseUrl}/${id}`,
      patch
    );
  }

  delete$(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
