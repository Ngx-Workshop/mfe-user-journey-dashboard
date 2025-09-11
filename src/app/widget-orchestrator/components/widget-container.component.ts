import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import {
  WidgetError,
  WidgetInstance,
  WidgetState,
} from '../interfaces';
import { WidgetCommunicationService } from '../services/widget-communication.service';
import { WidgetOrchestratorService } from '../services/widget-orchestrator.service';

/**
 * Widget Container Component
 * Provides error boundaries, loading states, and widget lifecycle management
 */
@Component({
  selector: 'ngx-widget-container',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <mat-card
      class="widget-container"
      [ngClass]="{
        'widget-error': hasError(),
        'widget-loading': isLoading(),
        'widget-resizable': isResizable(),
        'widget-movable': isMovable()
      }"
      [style]="containerStyles()"
    >
      <!-- Widget Header -->
      @if (showHeader) {
      <mat-card-title class="widget-header">
        <!-- Widget Icon -->
        @if (widgetIcon()) {
        <mat-icon class="widget-icon">
          {{ widgetIcon() }}
        </mat-icon>
        }
        <!-- Widget Title -->
        <span class="widget-title">{{ widgetTitle() }}</span>
        <!-- Widget Actions -->
        @if (showActions) {
        <div class="widget-actions">
          <!-- Refresh Button -->
          @if (canRefresh()) {
          <button
            mat-icon-button
            (click)="refreshWidget()"
            [disabled]="isLoading()"
            matTooltip="Refresh Widget"
          >
            <mat-icon>refresh</mat-icon>
          </button>
          }
          <!-- Settings Menu -->
          @if (canConfigure()) {
          <button
            mat-icon-button
            [matMenuTriggerFor]="settingsMenu"
            matTooltip="Widget Settings"
          >
            <mat-icon>settings</mat-icon>
          </button>
          }
          <!-- More Options Menu -->
          <button
            mat-icon-button
            [matMenuTriggerFor]="moreMenu"
            matTooltip="More Options"
          >
            <mat-icon>more_vert</mat-icon>
          </button>
        </div>
        }
      </mat-card-title>
      }

      <!-- Widget Content -->
      <mat-card-content class="widget-content">
        <!-- Loading State -->
        @if (isLoading()) {
        <div class="widget-loading-overlay">
          <mat-spinner diameter="40"></mat-spinner>
          <p>{{ loadingMessage() }}</p>
        </div>
        }

        <!-- Error State -->
        @if (hasError()) {
        <div class="widget-error-content">
          <mat-icon class="error-icon">error</mat-icon>
          <h3>Widget Error</h3>
          <p>{{ errorMessage() }}</p>
          @if (canRetry()) {
          <button
            mat-raised-button
            color="primary"
            (click)="retryWidget()"
          >
            Retry
          </button>
          }
        </div>
        }

        <!-- Widget Component Container -->
        @if(!hasError() && !isLoading()) {
        <div
          class="widget-component-container"
          #widgetContainer
        ></div>
        }
      </mat-card-content>

      <!-- Settings Menu -->
      <mat-menu #settingsMenu="matMenu">
        <button mat-menu-item (click)="configureWidget()">
          <mat-icon>tune</mat-icon>
          <span>Configure</span>
        </button>
        <button mat-menu-item (click)="resetWidget()">
          <mat-icon>restore</mat-icon>
          <span>Reset</span>
        </button>
      </mat-menu>

      <!-- More Options Menu -->
      <mat-menu #moreMenu="matMenu">
        <button mat-menu-item (click)="duplicateWidget()">
          <mat-icon>content_copy</mat-icon>
          <span>Duplicate</span>
        </button>
        <button mat-menu-item (click)="exportWidget()">
          <mat-icon>download</mat-icon>
          <span>Export</span>
        </button>
        <mat-divider></mat-divider>
        @if (canRemove()) {
        <button
          mat-menu-item
          (click)="removeWidget()"
          class="warning"
        >
          <mat-icon>delete</mat-icon>
          <span>Remove</span>
        </button>
        }
      </mat-menu>
    </mat-card>
  `,
  styles: [
    `
      .widget-container {
        position: relative;
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .widget-container.widget-error {
        border-left: 2px solid #f44336;
      }

      .widget-container.widget-loading {
        opacity: 0.8;
      }

      .widget-container.widget-resizable {
        resize: both;
      }

      .widget-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
        background: rgba(0, 0, 0, 0.02);
        min-height: 48px;
      }

      .widget-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .widget-title {
        flex: 1;
        font-weight: 500;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .widget-actions {
        display: flex;
        gap: 4px;
      }

      .widget-content {
        flex: 1;
        position: relative;
        padding: 0;
        overflow: hidden;
      }

      .widget-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        z-index: 10;
        gap: 16px;
      }

      .widget-error-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 24px;
        text-align: center;
        color: #666;
      }

      .error-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #f44336;
        margin-bottom: 16px;
      }

      .widget-component-container {
        height: 100%;
        width: 100%;
        overflow: auto;
      }

      .warning {
        color: #f44336 !important;
      }

      mat-card-title {
        margin: 0 !important;
      }

      mat-card-content {
        margin: 0 !important;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetContainerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) instance!: WidgetInstance;
  @Input() showHeader = true;
  @Input() showActions = true;
  @Input() allowResize = true;
  @Input() allowMove = true;
  @Input() allowRemove = true;
  @Input() allowConfigure = true;

  @ViewChild('widgetContainer', {
    read: ViewContainerRef,
    static: false,
  })
  widgetContainer!: ViewContainerRef;

  private readonly orchestrator = inject(WidgetOrchestratorService);
  private readonly communication = inject(WidgetCommunicationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  // Reactive state
  private readonly _state = signal<WidgetState>(
    WidgetState.INITIALIZING
  );
  private readonly _error = signal<WidgetError | null>(null);
  private readonly _loadingMessage = signal<string>(
    'Loading widget...'
  );

  // Computed properties
  readonly isLoading = computed(
    () =>
      this._state() === WidgetState.LOADING ||
      this._state() === WidgetState.INITIALIZING
  );

  readonly hasError = computed(
    () =>
      this._state() === WidgetState.ERROR || this._error() !== null
  );

  readonly widgetTitle = computed(
    () => this.instance?.config?.title || 'Widget'
  );

  readonly widgetIcon = computed(
    () =>
      this.instance?.config?.appearance?.icon ||
      this.instance?.definition?.icon
  );

  readonly errorMessage = computed(
    () =>
      this._error()?.message ||
      'An error occurred while loading the widget'
  );

  readonly loadingMessage = computed(() => this._loadingMessage());

  readonly canRefresh = computed(
    () =>
      this.instance?.config?.dataSource?.refreshInterval !== undefined
  );

  readonly canRetry = computed(
    () => this._error()?.recoverable !== false
  );

  readonly canRemove = computed(
    () =>
      this.allowRemove && this.instance?.config?.removable !== false
  );

  readonly canConfigure = computed(
    () =>
      this.allowConfigure &&
      this.instance?.config?.permissions?.configure !== false
  );

  readonly isResizable = computed(
    () =>
      this.allowResize && this.instance?.config?.resizable !== false
  );

  readonly isMovable = computed(
    () => this.allowMove && this.instance?.config?.movable !== false
  );

  readonly containerStyles = computed(() => {
    const appearance = this.instance?.config?.appearance;
    if (!appearance) return {};

    const styles: Record<string, string> = {};

    if (appearance.backgroundColor) {
      styles['background-color'] = appearance.backgroundColor;
    }

    if (appearance.textColor) {
      styles['color'] = appearance.textColor;
    }

    if (appearance.border) {
      const border = appearance.border;
      styles['border'] = `${border.width || 1}px ${
        border.style || 'solid'
      } ${border.color || '#ccc'}`;
    }

    return styles;
  });

  ngOnInit(): void {
    this.setupErrorHandling();
    this.setupStateSubscriptions();
    this.loadWidget();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load the widget component
   */
  private async loadWidget(): Promise<void> {
    if (!this.instance) {
      this.handleError({
        code: 'INVALID_INSTANCE',
        message: 'No widget instance provided',
        timestamp: new Date(),
        recoverable: false,
      });
      return;
    }

    try {
      this._state.set(WidgetState.LOADING);
      this._loadingMessage.set(
        `Loading ${this.instance.definition.name}...`
      );

      // Wait for view to be ready
      setTimeout(async () => {
        try {
          if (this.widgetContainer) {
            await this.orchestrator.loadWidgetComponent(
              this.instance,
              this.widgetContainer
            );
            this._state.set(WidgetState.LOADED);
          }
        } catch (loadError) {
          console.error('Widget loading failed:', loadError);
          this.handleError({
            code: 'LOAD_FAILED',
            message: `Failed to load widget: ${loadError}`,
            timestamp: new Date(),
            recoverable: true,
          });
        }
      }, 100);
    } catch (error) {
      this.handleError({
        code: 'LOAD_FAILED',
        message: `Failed to load widget: ${error}`,
        timestamp: new Date(),
        recoverable: true,
      });
    }
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Subscribe to orchestrator errors
    this.orchestrator
      .getErrors$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ instanceId, error }) => {
        if (instanceId === this.instance?.id) {
          this.handleError(error);
        }
      });
  }

  /**
   * Setup state subscriptions
   */
  private setupStateSubscriptions(): void {
    // Monitor instance state changes
    this.orchestrator
      .getInstances$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((instances) => {
        const updatedInstance = instances.find(
          (i) => i.id === this.instance?.id
        );
        if (updatedInstance) {
          this.instance = updatedInstance;
          this._state.set(updatedInstance.state);

          if (updatedInstance.error) {
            this._error.set(updatedInstance.error);
          } else {
            this._error.set(null);
          }

          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Handle widget error
   */
  private handleError(error: WidgetError): void {
    this._error.set(error);
    this._state.set(WidgetState.ERROR);

    // Show error notification
    this.snackBar.open(`Widget Error: ${error.message}`, 'Dismiss', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });

    this.cdr.markForCheck();
  }

  /**
   * Refresh widget
   */
  refreshWidget(): void {
    if (this.instance?.config?.dataSource) {
      this._loadingMessage.set('Refreshing data...');
      this.loadWidget();
    }
  }

  /**
   * Retry widget loading
   */
  retryWidget(): void {
    this._error.set(null);
    this.loadWidget();
  }

  /**
   * Configure widget
   */
  configureWidget(): void {
    // Emit configuration event
    this.communication.broadcast({
      type: 'WIDGET_CONFIGURE_REQUEST',
      source: this.instance.id,
      payload: { instanceId: this.instance.id },
      timestamp: new Date(),
      bubble: true,
    });
  }

  /**
   * Reset widget to default configuration
   */
  resetWidget(): void {
    const defaultConfig = this.instance.definition.defaultConfig;
    this.orchestrator.updateWidgetConfig(
      this.instance.id,
      defaultConfig
    );

    this.snackBar.open(
      'Widget reset to default configuration',
      'Dismiss',
      { duration: 3000 }
    );
  }

  /**
   * Duplicate widget
   */
  duplicateWidget(): void {
    this.communication.broadcast({
      type: 'WIDGET_DUPLICATE_REQUEST',
      source: this.instance.id,
      payload: { instanceId: this.instance.id },
      timestamp: new Date(),
      bubble: true,
    });
  }

  /**
   * Export widget configuration
   */
  exportWidget(): void {
    const exportData = {
      type: this.instance.definition.type,
      config: this.instance.config,
      data: this.instance.data,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `widget-${this.instance.id}.json`;
    a.click();

    URL.revokeObjectURL(url);

    this.snackBar.open('Widget configuration exported', 'Dismiss', {
      duration: 3000,
    });
  }

  /**
   * Remove widget
   */
  removeWidget(): void {
    this.communication.broadcast({
      type: 'WIDGET_REMOVE_REQUEST',
      source: this.instance.id,
      payload: { instanceId: this.instance.id },
      timestamp: new Date(),
      bubble: true,
    });
  }
}
