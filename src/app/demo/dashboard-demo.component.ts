import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  WidgetCommunicationService,
  WidgetDashboardComponent,
  WidgetOrchestratorService,
  WidgetRegistryService,
} from '../widget-orchestrator';
import {
  ApiDataProvider,
  AssessmentDataProvider,
  StaticDataProvider,
} from '../widget-orchestrator/services/data-providers.service';

@Component({
  selector: 'ngx-dashboard-demo',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, WidgetDashboardComponent],
  template: `
    <div class="demo-container">
      <!-- Header -->
      <!-- <div class="demo-header">
        <h1>Angular Widget Orchestrator Demo</h1>
        <p>
          A complete widget orchestration system with dynamic loading,
          communication, and layout management.
        </p>

        <div class="demo-actions">
          <button
            mat-raised-button
            color="primary"
            (click)="showFeatures()"
          >
            <mat-icon>info</mat-icon>
            Show Features
          </button>
          <button mat-raised-button (click)="resetDemo()">
            <mat-icon>refresh</mat-icon>
            Reset Demo
          </button>
        </div>
      </div> -->

      <!-- Widget Dashboard -->
      <ngx-widget-dashboard
        dashboardId="demo"
        [autoLoad]="true"
        [autoSave]="true"
        class="demo-dashboard"
      ></ngx-widget-dashboard>
    </div>
  `,
  styles: [
    `
      .demo-container {
        height: 100vh;
        display: flex;
        flex-direction: column;
        // background: linear-gradient(
        //   135deg,
        //   var(--mat-sys-secondary-fixed-dim) 0%,
        //   var(--mat-sys-secondary-container) 100%
        // );
      }

      .demo-header {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        padding: 24px;
        text-align: center;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }

      .demo-header h1 {
        margin: 0 0 8px 0;
        color: #333;
        font-weight: 300;
        font-size: 2.2rem;
      }

      .demo-header p {
        margin: 0 0 24px 0;
        color: #666;
        font-size: 1.1rem;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        line-height: 1.5;
      }

      .demo-actions {
        display: flex;
        gap: 16px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .demo-dashboard {
        flex: 1;
        overflow: hidden;
      }

      mat-icon {
        margin-right: 8px;
      }
    `,
  ],
})
export class DashboardDemoComponent implements OnInit {
  private readonly orchestrator = inject(WidgetOrchestratorService);
  private readonly registry = inject(WidgetRegistryService);
  private readonly communication = inject(WidgetCommunicationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly assessmentService = inject(AssessmentDataProvider);

  ngOnInit(): void {
    this.setupDataProviders();
    this.setupDemoEventHandlers();
  }

  /**
   * Show features information
   */
  showFeatures(): void {
    const features = [
      '🚀 Dynamic Widget Loading with Lazy Loading Support',
      '📊 Responsive Grid Layout with Drag & Drop',
      '🔄 Widget Communication & Event System',
      '💾 Layout Persistence & Export/Import',
      '🎨 Widget Configuration & Customization',
      '🛡️ Error Boundaries & Loading States',
      '📱 Mobile-Responsive Breakpoints',
      '🔌 Extensible Data Provider System',
      '🧩 Modular Widget Architecture',
      '⚡ Real-time Data Binding',
    ].join('\n');

    this.snackBar.open(
      `Widget Orchestrator Features:\n\n${features}`,
      'Close',
      {
        duration: 10000,
        panelClass: ['feature-snackbar'],
        verticalPosition: 'top',
      }
    );
  }

  /**
   * Reset demo to initial state
   */
  resetDemo(): void {
    // Clear all widgets
    const widgets = this.orchestrator.getAllWidgets();
    widgets.forEach((widget) => {
      this.orchestrator.destroyWidget(widget.id);
    });

    // Clear shared state
    this.communication.clearSharedState();

    // Clear layout history
    if (this.registry.hasWidget('dashboard-layout-manager')) {
      // Reset layout manager if available
    }

    this.snackBar.open('Demo reset to initial state', 'Dismiss', {
      duration: 3000,
    });
  }

  /**
   * Setup data providers
   */
  private setupDataProviders(): void {
    // Register data providers with the orchestrator
    this.orchestrator.registerDataProvider(this.assessmentService);
    this.orchestrator.registerDataProvider(new StaticDataProvider());
    this.orchestrator.registerDataProvider(new ApiDataProvider());
  }

  /**
   * Setup demo event handlers
   */
  private setupDemoEventHandlers(): void {
    // Listen for widget events to show demo information
    this.communication.subscribe('WIDGET_CREATED', (event) => {
      this.snackBar.open(
        `Widget created: ${event.payload.name}`,
        'Dismiss',
        { duration: 2000 }
      );
    });

    this.communication.subscribe('CHART_POINT_SELECTED', (event) => {
      this.snackBar.open(
        `Chart interaction: ${JSON.stringify(event.payload.data)}`,
        'Dismiss',
        { duration: 3000 }
      );
    });

    this.communication.subscribe('TODO_TOGGLED', (event) => {
      const status = event.payload.completed
        ? 'completed'
        : 'reopened';
      this.snackBar.open(
        `Todo ${status}: ${event.payload.todoId}`,
        'Dismiss',
        { duration: 2000 }
      );
    });

    this.communication.subscribe('CELEBRATION', (event) => {
      this.snackBar.open(`🎉 ${event.payload.message}`, 'Awesome!', {
        duration: 5000,
        panelClass: ['celebration-snackbar'],
      });
    });
  }
}
