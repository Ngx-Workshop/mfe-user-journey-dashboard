import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AssessmentTestService } from '../../assessment-test.service';
import { WidgetDataProvider, WidgetDataSource } from '../interfaces';

/**
 * Assessment Data Provider
 * Provides assessment and subject data for widgets
 */
@Injectable({
  providedIn: 'root',
})
export class AssessmentDataProvider implements WidgetDataProvider {
  readonly name = 'assessment';

  private readonly assessmentService = inject(AssessmentTestService);

  /**
   * Get data based on data source configuration
   */
  getData(config: WidgetDataSource): Observable<any> {
    switch (config.source) {
      case 'userAssessments':
        return this.assessmentService.fetchUsersAssessments();

      case 'subjectLevels':
        const subjects = config.parameters?.['subjects'] || [
          'ANGULAR',
          'NESTJS',
          'RXJS',
        ];
        return this.assessmentService.fetchUserSubjectsEligibility(
          subjects
        );

      case 'combinedData':
        return this.getCombinedAssessmentData(
          config.parameters?.['subjects']
        );

      default:
        return of(null);
    }
  }

  /**
   * Check if this provider supports the data source
   */
  supports(config: WidgetDataSource): boolean {
    return (
      (config.type === 'service' &&
        config.source.startsWith('assessment')) ||
      ['userAssessments', 'subjectLevels', 'combinedData'].includes(
        config.source
      )
    );
  }

  /**
   * Get combined assessment data
   */
  private getCombinedAssessmentData(
    subjects?: string[]
  ): Observable<any> {
    const subjectList = subjects || ['ANGULAR', 'NESTJS', 'RXJS'];

    return this.assessmentService.fetchUsersAssessments().pipe(
      map((assessmentTests) => {
        return this.assessmentService
          .fetchUserSubjectsEligibility(subjectList)
          .pipe(
            map((subjectLevels) => ({
              assessmentTests,
              subjectLevels,
            }))
          );
      }),
      catchError((error) => {
        console.error(
          'Failed to fetch combined assessment data:',
          error
        );
        return of({ assessmentTests: [], subjectLevels: [] });
      })
    );
  }
}

/**
 * Static Data Provider
 * Provides static/mock data for widgets
 */
@Injectable({
  providedIn: 'root',
})
export class StaticDataProvider implements WidgetDataProvider {
  readonly name = 'static';

  /**
   * Get static data
   */
  getData(config: WidgetDataSource): Observable<any> {
    const data = config.parameters?.['data'] || config.source;
    return of(data);
  }

  /**
   * Check if this provider supports the data source
   */
  supports(config: WidgetDataSource): boolean {
    return config.type === 'static';
  }
}

/**
 * API Data Provider
 * Provides data from external APIs
 */
@Injectable({
  providedIn: 'root',
})
export class ApiDataProvider implements WidgetDataProvider {
  readonly name = 'api';

  /**
   * Get data from API
   */
  getData(config: WidgetDataSource): Observable<any> {
    // This would implement actual HTTP calls
    // For now, return mock data
    console.warn(
      'API data provider not yet implemented for:',
      config.source
    );
    return of(null);
  }

  /**
   * Check if this provider supports the data source
   */
  supports(config: WidgetDataSource): boolean {
    return config.type === 'api';
  }
}
