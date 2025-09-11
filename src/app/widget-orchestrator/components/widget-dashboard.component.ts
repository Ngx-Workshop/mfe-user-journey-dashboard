import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, combineLatest } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { AssessmentTestService } from '../../assessment-test.service';
import { DashboardConfig, WidgetDefinition } from '../interfaces';
import { DashboardLayoutManagerService } from '../services/dashboard-layout-manager.service';
import { WidgetCommunicationService } from '../services/widget-communication.service';
import { WidgetOrchestratorService } from '../services/widget-orchestrator.service';
import { WidgetRegistryService } from '../services/widget-registry.service';
import { WidgetContainerComponent } from './widget-container.component';

@Component({
  selector: 'ngx-widget-dashboard',
  standalone: true,
  imports: [
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    WidgetContainerComponent
],
  template: `
    <div class="dashboard-container">
      <!-- Dashboard Toolbar -->
      <mat-toolbar color="primary" class="dashboard-toolbar">
        <!-- <span>{{ dashboardTitle() }}</span> -->
    
        <div class="toolbar-spacer"></div>
    
        <!-- Dashboard Actions -->
        <button
          mat-icon-button
          [matMenuTriggerFor]="addWidgetMenu"
          matTooltip="Add Widget"
          >
          <mat-icon>add</mat-icon>
        </button>
    
        <button
          mat-icon-button
          (click)="saveLayout()"
          matTooltip="Save Layout"
          >
          <mat-icon>save</mat-icon>
        </button>
    
        <button
          mat-icon-button
          (click)="compactLayout()"
          matTooltip="Compact Layout"
          >
          <mat-icon>grid_view</mat-icon>
        </button>
    
        <button
          mat-icon-button
          [matMenuTriggerFor]="dashboardMenu"
          matTooltip="Dashboard Options"
          >
          <mat-icon>more_vert</mat-icon>
        </button>
      </mat-toolbar>
    
      <!-- Draggable Grid Container -->
      <div class="grid-container" [style.padding.px]="gridMargin()">
        <div
          class="draggable-grid"
          cdkDropList
          [cdkDropListData]="widgets()"
          (cdkDropListDropped)="onWidgetDrop($event)"
          [style.grid-template-columns]="
            'repeat(' + gridCols() + ', 1fr)'
          "
          [style.gap.px]="gridGutter()"
          >
          @for (widget of widgets(); track widget.id) {
            <div
              class="widget-item"
              cdkDrag
              [style.grid-column]="'span ' + widget.config.layout.cols"
              [style.grid-row]="'span ' + widget.config.layout.rows"
            [style.min-height.px]="
              gridRowHeight() * widget.config.layout.rows +
              gridGutter() * (widget.config.layout.rows - 1)
            "
              >
              <div
                class="drag-handle"
                cdkDragHandle
                matTooltip="Drag to move widget"
              [style.display]="
                widget.config.movable === false ? 'none' : 'flex'
              "
                >
                <mat-icon>drag_indicator</mat-icon>
              </div>
    
              <ngx-widget-container
                [instance]="widget"
                [showHeader]="true"
                [showActions]="true"
                [allowResize]="true"
                [allowMove]="true"
                [allowRemove]="true"
                [allowConfigure]="true"
                class="widget-container-wrapper"
              ></ngx-widget-container>
    
              <div class="drag-placeholder" *cdkDragPlaceholder>
                <div class="placeholder-content">
                  <mat-icon>dashboard</mat-icon>
                  <span>Drop here</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    
      <!-- Empty State -->
      @if (widgets().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">dashboard</mat-icon>
          <h2>Welcome to Your Dashboard</h2>
          <p>Start by adding your first widget!</p>
          <button
            mat-raised-button
            color="primary"
            [matMenuTriggerFor]="addWidgetMenu"
            >
            <mat-icon>add</mat-icon>
            Add Widget
          </button>
        </div>
      }
    
      <!-- Add Widget Menu -->
      <mat-menu #addWidgetMenu="matMenu">
        <div class="widget-menu-header">
          <h3>Available Widgets</h3>
        </div>
        @for (category of availableCategories(); track category) {
          <div class="widget-category">
            <h4>{{ category }}</h4>
            @for (definition of getWidgetsByCategory(category); track
              definition.type) {
              <button
                mat-menu-item
                (click)="addWidget(definition)"
                class="widget-menu-item"
                >
                @if (definition.icon) {
                  <mat-icon>{{
                    definition.icon
                  }}</mat-icon>
                }
                <span>{{ definition.name }}</span>
                <small>{{ definition.description }}</small>
              </button>
            }
          </div>
        }
      </mat-menu>
    
      <!-- Dashboard Menu -->
      <mat-menu #dashboardMenu="matMenu">
        <button mat-menu-item (click)="resetLayout()">
          <mat-icon>restore</mat-icon>
          <span>Reset Layout</span>
        </button>
        <button mat-menu-item (click)="exportDashboard()">
          <mat-icon>download</mat-icon>
          <span>Export Dashboard</span>
        </button>
        <button mat-menu-item (click)="importDashboard()">
          <mat-icon>upload</mat-icon>
          <span>Import Dashboard</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="clearDashboard()">
          <mat-icon>clear_all</mat-icon>
          <span>Clear All Widgets</span>
        </button>
      </mat-menu>
    </div>
    `,
  styles: [
    `
      .dashboard-container {
        height: 100vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .dashboard-toolbar {
        flex-shrink: 0;
        z-index: 10;
      }

      .toolbar-spacer {
        flex: 1 1 auto;
      }

      .grid-container {
        flex: 1;
        overflow: auto;
        // background-color: #f5f5f5;
      }

      .widget-tile {
        padding: 8px !important;
      }

      .widget-container-wrapper {
        width: 100%;
        height: 100%;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: #666;
        padding: 48px;
      }

      .empty-icon {
        font-size: 72px;
        width: 72px;
        height: 72px;
        margin-bottom: 24px;
        opacity: 0.3;
      }

      .empty-state h2 {
        margin: 0 0 8px 0;
        font-weight: 300;
      }

      .empty-state p {
        margin: 0 0 24px 0;
        opacity: 0.7;
      }

      .widget-menu-header {
        padding: 12px 16px 8px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      }

      .widget-menu-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.87);
      }

      .widget-category {
        padding: 8px 0;
      }

      .widget-category h4 {
        margin: 0;
        padding: 8px 16px 4px;
        font-size: 12px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.54);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .widget-menu-item {
        padding: 12px 16px !important;
        height: auto !important;
        line-height: 1.2 !important;
        white-space: normal !important;
      }

      .widget-menu-item mat-icon {
        margin-right: 12px;
        color: rgba(0, 0, 0, 0.54);
      }

      .widget-menu-item span {
        display: block;
        font-weight: 500;
      }

      .widget-menu-item small {
        display: block;
        margin-top: 4px;
        font-size: 11px;
        color: rgba(0, 0, 0, 0.54);
        line-height: 1.3;
      }

      mat-grid-list {
        background-color: transparent;
      }

      mat-grid-tile {
        background-color: transparent;
      }

      /* Draggable Grid Styles */
      .draggable-grid {
        display: grid;
        width: 100%;
        min-height: 100%;
        padding: 8px;
        box-sizing: border-box;
      }

      .widget-item {
        position: relative;
        display: flex;
        flex-direction: column;
        border-radius: 8px;
        background-color: transparent;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .widget-item.cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      .widget-item.cdk-drag-dragging {
        z-index: 1000;
        transform: scale(1.05);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        // background-color: #ffffff;
      }

      .drag-handle {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 50%;
        cursor: grab;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .widget-item:hover .drag-handle {
        opacity: 1;
      }

      .drag-handle:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }

      .drag-handle:active {
        cursor: grabbing;
      }

      .drag-handle mat-icon {
        font-size: 18px;
        color: rgba(0, 0, 0, 0.6);
      }

      .widget-container-wrapper {
        flex: 1;
        width: 100%;
        height: 100%;
        min-height: 200px;
      }

      .drag-placeholder {
        background: rgba(0, 0, 0, 0.1);
        border: 2px dashed rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        transition: all 0.2s ease;
      }

      .placeholder-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: rgba(0, 0, 0, 0.5);
      }

      .placeholder-content mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }

      .placeholder-content span {
        font-size: 14px;
        font-weight: 500;
      }

      /* CDK Drop List Styles */
      .cdk-drop-list-dragging
        .widget-item:not(.cdk-drag-placeholder) {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetDashboardComponent implements OnInit, OnDestroy {
  @Input() dashboardId = 'default';
  @Input() autoLoad = true;
  @Input() autoSave = true;

  private readonly orchestrator = inject(WidgetOrchestratorService);
  private readonly registry = inject(WidgetRegistryService);
  private readonly layoutManager = inject(
    DashboardLayoutManagerService
  );
  private readonly communication = inject(WidgetCommunicationService);
  private readonly assessmentService = inject(AssessmentTestService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  // Dashboard state
  private readonly _dashboardConfig = signal<DashboardConfig>({
    id: this.dashboardId,
    title: 'Widget Dashboard',
    grid: {
      cols: 12,
      rowHeight: 100,
      margin: 10,
      outerMargin: 10,
      responsive: true,
    },
    widgets: [],
  });

  // Computed properties
  readonly dashboardTitle = computed(
    () => this._dashboardConfig().title
  );
  readonly gridCols = computed(
    () => this._dashboardConfig().grid.cols
  );
  readonly gridRowHeight = computed(
    () => this._dashboardConfig().grid.rowHeight
  );
  readonly gridGutter = computed(
    () => this._dashboardConfig().grid.margin
  );
  readonly gridMargin = computed(
    () => this._dashboardConfig().grid.outerMargin
  );
  readonly widgets = computed(() => this._dashboardConfig().widgets);
  readonly availableCategories = computed(() =>
    this.registry.getCategories()
  );

  ngOnInit(): void {
    this.setupWidgetRegistry();
    this.setupEventHandling();
    this.setupDataBinding();

    if (this.autoLoad) {
      this.loadDashboard();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Add a new widget to the dashboard
   */
  async addWidget(definition: WidgetDefinition): Promise<void> {
    try {
      // Create widget instance
      const instance = await this.orchestrator.createWidget(
        definition.type,
        {
          ...definition.defaultConfig,
          title: definition.name,
        }
      );

      // Add to layout manager
      this.layoutManager.addWidget(instance);

      // Update dashboard config
      this.updateDashboardFromLayout();

      this.snackBar.open(
        `Added ${definition.name} widget`,
        'Dismiss',
        { duration: 3000 }
      );
    } catch (error) {
      this.snackBar.open(
        `Failed to add widget: ${error}`,
        'Dismiss',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
    }
  }

  /**
   * Remove a widget from the dashboard
   */
  removeWidget(instanceId: string): void {
    if (this.orchestrator.destroyWidget(instanceId)) {
      this.layoutManager.removeWidget(instanceId);
      this.updateDashboardFromLayout();

      this.snackBar.open('Widget removed', 'Dismiss', {
        duration: 3000,
      });
    }
  }

  /**
   * Get widgets by category
   */
  getWidgetsByCategory(category: string): WidgetDefinition[] {
    return this.registry.getWidgetsByCategory(category);
  }

  /**
   * Save current dashboard layout
   */
  saveLayout(): void {
    this.layoutManager.saveLayout(`dashboard-${this.dashboardId}`);
    this.snackBar.open('Dashboard layout saved', 'Dismiss', {
      duration: 3000,
    });
  }

  /**
   * Compact dashboard layout
   */
  compactLayout(): void {
    this.layoutManager.compactLayout();
    this.updateDashboardFromLayout();

    this.snackBar.open('Layout compacted', 'Dismiss', {
      duration: 3000,
    });
  }

  /**
   * Reset dashboard layout
   */
  resetLayout(): void {
    // Reset all widgets to default positions
    const widgets = this.widgets();
    widgets.forEach((widget, index) => {
      this.layoutManager.updateWidgetLayout(widget.id, {
        x: (index % this.gridCols()) * 2,
        y: Math.floor(index / this.gridCols()) * 2,
        cols: 2,
        rows: 2,
      });
    });

    this.updateDashboardFromLayout();

    this.snackBar.open('Layout reset', 'Dismiss', { duration: 3000 });
  }

  /**
   * Handle widget drag and drop
   */
  onWidgetDrop(event: CdkDragDrop<any>): void {
    if (event.previousIndex !== event.currentIndex) {
      const widgets = [...this.widgets()];
      moveItemInArray(
        widgets,
        event.previousIndex,
        event.currentIndex
      );

      // Update the dashboard config with new order
      this._dashboardConfig.update((config) => ({
        ...config,
        widgets,
      }));

      // Update layout manager with new widget order
      this.layoutManager.updateDashboardConfig({ widgets });

      this.snackBar.open('Widget moved', 'Dismiss', {
        duration: 2000,
      });
    }
  }

  /**
   * Export dashboard configuration
   */
  exportDashboard(): void {
    const config = this.layoutManager.exportDashboard();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${this.dashboardId}-${
      new Date().toISOString().split('T')[0]
    }.json`;
    a.click();

    URL.revokeObjectURL(url);

    this.snackBar.open('Dashboard exported', 'Dismiss', {
      duration: 3000,
    });
  }

  /**
   * Import dashboard configuration
   */
  importDashboard(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const config = e.target.result;
            if (this.layoutManager.importDashboard(config)) {
              this.loadDashboard();
              this.snackBar.open(
                'Dashboard imported successfully',
                'Dismiss',
                { duration: 3000 }
              );
            } else {
              throw new Error('Invalid dashboard configuration');
            }
          } catch (error) {
            this.snackBar.open(`Import failed: ${error}`, 'Dismiss', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }

  /**
   * Clear all widgets from dashboard
   */
  clearDashboard(): void {
    const widgets = this.widgets();
    widgets.forEach((widget) => {
      this.orchestrator.destroyWidget(widget.id);
    });

    this._dashboardConfig.update((config) => ({
      ...config,
      widgets: [],
    }));

    this.snackBar.open('Dashboard cleared', 'Dismiss', {
      duration: 3000,
    });
  }

  /**
   * Setup widget registry with available widgets
   */
  private setupWidgetRegistry(): void {
    // Register available widgets
    const widgetDefinitions: WidgetDefinition[] = [
      {
        type: 'todo-widget',
        name: 'Todo List',
        description: 'Track your learning tasks and progress',
        component: null as any, // Will be loaded dynamically
        category: 'Productivity',
        defaultConfig: {
          type: 'todo-widget',
          title: 'Todo List',
          layout: { cols: 2, rows: 2 },
          resizable: true,
          movable: true,
          removable: true,
        },
        icon: 'checklist',
        tags: ['productivity', 'tasks', 'learning'],
        lazy: true,
        loadComponent: () =>
          import('../../widgets/todo-widget.component').then(
            (m) => m.TodoWidgetComponent
          ),
      },
      {
        type: 'graph-widget',
        name: 'Progress Chart',
        description: 'Visualize your learning progress over time',
        component: null as any,
        category: 'Analytics',
        defaultConfig: {
          type: 'graph-widget',
          title: 'Progress Chart',
          layout: { cols: 4, rows: 3 },
          resizable: true,
          movable: true,
          removable: true,
          settings: {
            showLegend: true,
            legendTitle: 'Subjects',
          },
        },
        icon: 'trending_up',
        tags: ['analytics', 'charts', 'progress'],
        lazy: true,
        loadComponent: () =>
          import(
            '../../widgets/graph-widget-refactored.component'
          ).then((m) => m.GraphWidgetComponent),
      },
      {
        type: 'tests-info-widget',
        name: 'Assessment Info',
        description:
          'View detailed information about your assessments',
        component: null as any,
        category: 'Education',
        defaultConfig: {
          type: 'tests-info-widget',
          title: 'Assessment Info',
          layout: { cols: 3, rows: 4 },
          resizable: true,
          movable: true,
          removable: true,
        },
        icon: 'quiz',
        tags: ['education', 'assessments', 'tests'],
        lazy: true,
        loadComponent: () =>
          import('../../widgets/tests-info-widget.component').then(
            (m) => m.TestsInfoWidgetComponent
          ),
      },
    ];

    this.registry.registerMany(widgetDefinitions);
  }

  /**
   * Setup event handling
   */
  private setupEventHandling(): void {
    // Handle widget events
    this.communication.subscribe('WIDGET_REMOVE_REQUEST', (event) => {
      this.removeWidget(event.payload.instanceId);
    });

    this.communication.subscribe(
      'WIDGET_DUPLICATE_REQUEST',
      (event) => {
        this.duplicateWidget(event.payload.instanceId);
      }
    );

    this.communication.subscribe(
      'WIDGET_CONFIGURE_REQUEST',
      (event) => {
        this.configureWidget(event.payload.instanceId);
      }
    );

    // Handle layout changes
    this.layoutManager
      .getDashboardConfig$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        this._dashboardConfig.set(config);
      });
  }

  /**
   * Setup data binding for widgets
   */
  private setupDataBinding(): void {
    // Fetch assessment data and share with widgets
    combineLatest([
      this.assessmentService.fetchUsersAssessments(),
      this.assessmentService.fetchUserSubjectsEligibility([
        'ANGULAR',
        'NESTJS',
        'RXJS',
      ]),
    ])
      .pipe(
        takeUntil(this.destroy$),
        map(([assessmentTests, subjectLevels]) => ({
          assessmentTests,
          subjectLevels,
        }))
      )
      .subscribe((data) => {
        // Share data with all widgets
        this.communication.setSharedState('assessmentData', data);

        // Update individual widgets
        const widgets = this.widgets();
        widgets.forEach((widget) => {
          this.orchestrator.updateWidgetData(widget.id, data);
        });
      });
  }

  /**
   * Load dashboard from storage
   */
  private loadDashboard(): void {
    if (
      this.layoutManager.loadLayout(`dashboard-${this.dashboardId}`)
    ) {
      // Dashboard loaded from storage
      this.recreateWidgetsFromConfig();
    } else {
      // Create default dashboard
      this.createDefaultDashboard();
    }
  }

  /**
   * Recreate widgets from saved configuration
   */
  private async recreateWidgetsFromConfig(): Promise<void> {
    const config = this.layoutManager.getDashboardConfig();

    for (const widget of config.widgets) {
      try {
        await this.orchestrator.createWidget(
          widget.definition.type,
          widget.config
        );
      } catch (error) {
        console.warn(
          `Failed to recreate widget ${widget.id}:`,
          error
        );
      }
    }
  }

  /**
   * Create default dashboard layout
   */
  private async createDefaultDashboard(): Promise<void> {
    try {
      // Add default widgets
      const todoWidget = await this.orchestrator.createWidget(
        'todo-widget',
        {
          type: 'todo-widget',
          title: 'My Tasks',
          layout: { cols: 2, rows: 2, x: 0, y: 0 },
        }
      );

      const graphWidget = await this.orchestrator.createWidget(
        'graph-widget',
        {
          type: 'graph-widget',
          title: 'Progress Overview',
          layout: { cols: 4, rows: 3, x: 2, y: 0 },
        }
      );

      const testsWidget = await this.orchestrator.createWidget(
        'tests-info-widget',
        {
          type: 'tests-info-widget',
          title: 'Assessment Status',
          layout: { cols: 3, rows: 4, x: 6, y: 0 },
        }
      );

      // Add to layout manager
      this.layoutManager.addWidget(todoWidget);
      this.layoutManager.addWidget(graphWidget);
      this.layoutManager.addWidget(testsWidget);

      this.updateDashboardFromLayout();
    } catch (error) {
      console.error('Failed to create default dashboard:', error);
    }
  }

  /**
   * Update dashboard config from layout manager
   */
  private updateDashboardFromLayout(): void {
    const config = this.layoutManager.getDashboardConfig();
    this._dashboardConfig.set(config);
  }

  /**
   * Duplicate a widget
   */
  private async duplicateWidget(instanceId: string): Promise<void> {
    const widget = this.orchestrator.getWidget(instanceId);
    if (widget) {
      try {
        const duplicatedConfig = {
          ...widget.config,
          title: `${widget.config.title} (Copy)`,
          layout: {
            ...widget.config.layout,
            x:
              (widget.config.layout.x || 0) +
              widget.config.layout.cols,
            y: widget.config.layout.y,
          },
        };

        const duplicatedWidget = await this.orchestrator.createWidget(
          widget.definition.type,
          duplicatedConfig
        );

        this.layoutManager.addWidget(duplicatedWidget);
        this.updateDashboardFromLayout();

        this.snackBar.open('Widget duplicated', 'Dismiss', {
          duration: 3000,
        });
      } catch (error) {
        this.snackBar.open(
          `Failed to duplicate widget: ${error}`,
          'Dismiss',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
      }
    }
  }

  /**
   * Configure a widget
   */
  private configureWidget(instanceId: string): void {
    // This would open a configuration dialog
    // For now, just show a message
    this.snackBar.open(
      'Widget configuration not yet implemented',
      'Dismiss',
      { duration: 3000 }
    );
  }
}
