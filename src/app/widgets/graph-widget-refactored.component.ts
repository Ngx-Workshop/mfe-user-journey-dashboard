
import { Component, computed, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { map, timer } from 'rxjs';
import { SubjectLevel } from '../assessment-test.service';
import { BaseWidget } from '../widget-orchestrator/base/base-widget.directive';
import { WidgetConfig } from '../widget-orchestrator/interfaces';

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ChartSeries {
  name: string;
  series: ChartDataPoint[];
}

@Component({
  selector: 'ngx-graph-widget',
  imports: [MatExpansionModule, NgxChartsModule],
  template: `
    @if(isVisible()) {
    <div class="graph-widget">
      <h2>{{ widgetTitle() }}</h2>

      <ngx-charts-line-chart
        [scheme]="colorScheme"
        [legend]="showLegend()"
        [legendTitle]="legendTitle()"
        [showXAxisLabel]="showXAxisLabel"
        [showYAxisLabel]="showYAxisLabel"
        [xAxis]="xAxis"
        [yAxis]="yAxis"
        [xAxisLabel]="xAxisLabel"
        [yAxisLabel]="yAxisLabel"
        [timeline]="timeline"
        [results]="chartData()"
        [autoScale]="autoScale"
        [animations]="animations"
        (select)="onSelect($event)"
        (activate)="onActivate($event)"
        (deactivate)="onDeactivate($event)"
      >
      </ngx-charts-line-chart>
    </div>
    } @else {
    <div class="loading-state">
      <p>Loading chart data...</p>
    </div>
    }
  `,
  styles: [
    `
      .graph-widget {
        height: 100%;
        width: 100%;
        padding: 16px;
        display: flex;
        flex-direction: column;
      }

      .graph-widget h2 {
        margin: 0 0 16px 0;
        font-weight: 300;
        color: var(--mat-sys-on-surface);
      }

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--mat-sys-on-surface-variant);
      }

      :host {
        display: block;
        height: 100%;

        &::ng-deep .ngx-charts .gridline-path {
          color: var(--mat-sys-on-secondary-container) !important;
          stroke: var(--mat-sys-on-secondary-container) !important;
          fill: var(--mat-sys-on-secondary-container) !important;
        }

        &::ng-deep .ngx-charts {
          font-weight: 100;
          font-size: 1.2rem;
        }

        &::ng-deep .ngx-charts .line-series .line {
          stroke-width: 2px;
        }

        &::ng-deep .ngx-charts .circle {
          r: 4;
        }

        &::ng-deep .legend .legend-items .legend-item {
          font-size: 12px;
        }
      }
    `,
  ],
})
export class GraphWidgetComponent extends BaseWidget {
  // Chart configuration
  private readonly _isVisible = signal(false);
  private readonly _chartData = signal<ChartSeries[]>([]);

  // Chart settings
  autoScale = true;
  animations = true;
  xAxis = true;
  yAxis = true;
  showYAxisLabel = true;
  showXAxisLabel = false;
  xAxisLabel = 'Time Period';
  yAxisLabel = 'Progress Score';
  timeline = true;

  // Computed properties
  readonly isVisible = computed(() => this._isVisible());
  readonly chartData = computed(() => this._chartData());
  readonly widgetTitle = computed(
    () => this.config?.title || 'Progress Chart'
  );
  readonly showLegend = computed(
    () => this.config?.settings?.['showLegend'] !== false
  );
  readonly legendTitle = computed(
    () => this.config?.settings?.['legendTitle'] || 'Subjects'
  );

  // Color scheme
  colorScheme = {
    domain: [
      '#5AA454', // Green
      '#E44D25', // Red
      '#7aa3e5', // Blue
      '#CFC0BB', // Gray
      '#a8385d', // Purple
      '#aae3f5', // Light Blue
    ],
    group: ScaleType.Ordinal,
    name: 'cool',
    selectable: true,
  };

  override onInit(): void {
    // Delay visibility for smooth animation
    timer(500)
      .pipe(map(() => true))
      .subscribe(() => {
        this._isVisible.set(true);
      });

    this.generateChartData();
    this.setupDataSubscription();
  }

  override onDataChange(data: any): void {
    this.generateChartData();
  }

  override onConfigChange(config: Partial<WidgetConfig>): void {
    // Handle chart configuration changes
    if (config.settings?.['chartType']) {
      this.updateChartType(config.settings['chartType']);
    }

    if (config.settings?.['timeRange']) {
      this.updateTimeRange(config.settings['timeRange']);
    }
  }

  override onEvent(event: any): void {
    switch (event.type) {
      case 'ASSESSMENT_COMPLETED':
        this.handleAssessmentCompleted(event.payload);
        break;
      case 'TIME_RANGE_CHANGED':
        this.updateTimeRange(event.payload.range);
        break;
      case 'CHART_FILTER_CHANGED':
        this.applyFilter(event.payload.filter);
        break;
    }
  }

  /**
   * Handle chart point selection
   */
  onSelect(data: any): void {
    this.emit({
      type: 'CHART_POINT_SELECTED',
      payload: {
        data,
        widget: 'graph',
        timestamp: new Date(),
      },
    });
  }

  /**
   * Handle chart point activation (hover)
   */
  onActivate(data: any): void {
    this.emit({
      type: 'CHART_POINT_ACTIVATED',
      payload: { data, widget: 'graph' },
    });
  }

  /**
   * Handle chart point deactivation
   */
  onDeactivate(data: any): void {
    this.emit({
      type: 'CHART_POINT_DEACTIVATED',
      payload: { data, widget: 'graph' },
    });
  }

  /**
   * Generate chart data from widget data
   */
  private generateChartData(): void {
    const data = this.data() as {
      subjectLevels?: SubjectLevel[];
      assessmentTests?: any[];
    };

    if (!data?.subjectLevels) {
      this.generateSampleData();
      return;
    }

    const chartSeries: ChartSeries[] = data.subjectLevels.map(
      (subject) => {
        // Generate progress data points (this would come from real historical data)
        const progressData = this.generateProgressData(subject);

        return {
          name: subject.subject,
          series: progressData,
        };
      }
    );

    this._chartData.set(chartSeries);

    // Share chart data with other widgets
    this.setSharedState('chartData', chartSeries);
  }

  /**
   * Generate progress data for a subject
   */
  private generateProgressData(
    subject: SubjectLevel
  ): ChartDataPoint[] {
    const timePoints = [
      'Week 1',
      'Week 2',
      'Week 3',
      'Week 4',
      'Week 5',
    ];
    const progressMultiplier =
      subject.levelCount / subject.totalCount;

    return timePoints.map((point, index) => ({
      name: point,
      value:
        Math.floor((index + 1) * progressMultiplier * 20) +
        Math.random() * 5,
    }));
  }

  /**
   * Generate sample data when no real data is available
   */
  private generateSampleData(): void {
    const sampleData: ChartSeries[] = [
      {
        name: 'Angular',
        series: [
          { name: 'Week 1', value: 2 },
          { name: 'Week 2', value: 5 },
          { name: 'Week 3', value: 8 },
          { name: 'Week 4', value: 12 },
          { name: 'Week 5', value: 16 },
        ],
      },
      {
        name: 'NestJS',
        series: [
          { name: 'Week 1', value: 1 },
          { name: 'Week 2', value: 3 },
          { name: 'Week 3', value: 4 },
          { name: 'Week 4', value: 7 },
          { name: 'Week 5', value: 9 },
        ],
      },
      {
        name: 'RxJS',
        series: [
          { name: 'Week 1', value: 0 },
          { name: 'Week 2', value: 2 },
          { name: 'Week 3', value: 6 },
          { name: 'Week 4', value: 8 },
          { name: 'Week 5', value: 11 },
        ],
      },
    ];

    this._chartData.set(sampleData);
  }

  /**
   * Setup data subscription for real-time updates
   */
  private setupDataSubscription(): void {
    // Subscribe to assessment completion events
    this.subscribeToEvents('ASSESSMENT_COMPLETED', (event) => {
      this.generateChartData();
    });

    // Subscribe to shared state changes
    this.subscribeToSharedState<any>('assessmentData', (data) => {
      if (data) {
        this.generateChartData();
      }
    });
  }

  /**
   * Handle assessment completion event
   */
  private handleAssessmentCompleted(payload: any): void {
    const { subject, score, timestamp } = payload;

    // Update chart data with new assessment result
    const currentData = this._chartData();
    const updatedData = currentData.map((series) => {
      if (series.name === subject) {
        const newDataPoint: ChartDataPoint = {
          name: new Date(timestamp).toLocaleDateString(),
          value: score,
        };

        return {
          ...series,
          series: [...series.series, newDataPoint],
        };
      }
      return series;
    });

    this._chartData.set(updatedData);

    // Emit chart update event
    this.emit({
      type: 'CHART_DATA_UPDATED',
      payload: { subject, score, chartData: updatedData },
    });
  }

  /**
   * Update chart type
   */
  private updateChartType(chartType: string): void {
    // This would involve changing the chart component type
    // For now, we just emit an event
    this.emit({
      type: 'CHART_TYPE_CHANGED',
      payload: { chartType },
    });
  }

  /**
   * Update time range for chart data
   */
  private updateTimeRange(range: string): void {
    // Filter chart data based on time range
    const currentData = this._chartData();
    const filteredData = this.filterDataByTimeRange(
      currentData,
      range
    );
    this._chartData.set(filteredData);
  }

  /**
   * Apply filter to chart data
   */
  private applyFilter(filter: any): void {
    // Apply various filters to the chart data
    const currentData = this._chartData();
    const filteredData = this.applyDataFilter(currentData, filter);
    this._chartData.set(filteredData);
  }

  /**
   * Filter data by time range
   */
  private filterDataByTimeRange(
    data: ChartSeries[],
    range: string
  ): ChartSeries[] {
    // Implementation would depend on the range format
    // For now, return the same data
    return data;
  }

  /**
   * Apply data filter
   */
  private applyDataFilter(
    data: ChartSeries[],
    filter: any
  ): ChartSeries[] {
    // Implementation would depend on the filter format
    // For now, return the same data
    return data;
  }
}
