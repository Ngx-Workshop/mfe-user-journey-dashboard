import {
  Directive,
  inject,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IWidget, WidgetConfig, WidgetEvent } from '../interfaces';
import { WidgetCommunicationService } from '../services/widget-communication.service';

/**
 * Base Widget Directive
 * Provides common functionality for all widgets
 */
@Directive()
export abstract class BaseWidget
  implements IWidget, OnInit, OnDestroy
{
  // Required properties from IWidget interface
  id = '';
  config!: WidgetConfig;
  data = input<any>();

  // Services
  protected readonly communication = inject(
    WidgetCommunicationService
  );
  protected readonly destroy$ = new Subject<void>();

  // Widget lifecycle hooks
  ngOnInit(): void {
    this.setupEventHandling();
    this.onInit?.();
  }

  ngOnDestroy(): void {
    this.onDestroy?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // IWidget interface methods
  onInit?(): void;
  onDestroy?(): void;
  onDataChange?(data: any): void;
  onConfigChange?(config: Partial<WidgetConfig>): void;

  /**
   * Emit event to other widgets
   */
  emit(event: Partial<WidgetEvent>): void {
    this.communication.broadcast({
      type: event.type || 'custom',
      source: this.id,
      target: event.target,
      payload: event.payload,
      timestamp: new Date(),
      bubble: event.bubble ?? true,
    });
  }

  /**
   * Handle events from other widgets
   */
  onEvent(event: WidgetEvent): void {
    // Override in subclasses to handle specific events
  }

  /**
   * Send request to another widget
   */
  protected async sendRequest<T>(
    targetId: string,
    requestType: string,
    payload?: any
  ): Promise<T> {
    return this.communication.request<T>(
      targetId,
      requestType,
      payload
    );
  }

  /**
   * Subscribe to specific event types
   */
  protected subscribeToEvents(
    eventType: string,
    handler: (event: WidgetEvent) => void
  ): void {
    this.communication.subscribe(eventType, handler);
  }

  /**
   * Subscribe to events from specific widget
   */
  protected subscribeToWidget(
    sourceId: string,
    handler: (event: WidgetEvent) => void
  ): void {
    this.communication.subscribeToWidget(sourceId, handler);
  }

  /**
   * Get shared state value
   */
  protected getSharedState<T>(key: string): T | undefined {
    return this.communication.getSharedState<T>(key);
  }

  /**
   * Set shared state value
   */
  protected setSharedState<T>(key: string, value: T): void {
    this.communication.setSharedState(key, value);
  }

  /**
   * Subscribe to shared state changes
   */
  protected subscribeToSharedState<T>(
    key: string,
    handler: (value: T) => void
  ): void {
    this.communication
      .subscribeToSharedState<T>(key)
      .pipe(takeUntil(this.destroy$))
      .subscribe(handler);
  }

  /**
   * Setup event handling
   */
  private setupEventHandling(): void {
    // Subscribe to targeted events for this widget
    this.communication.subscribeToTargetedEvents(this.id, (event) => {
      this.onEvent(event);
    });

    // Subscribe to configuration change events
    this.subscribeToEvents('WIDGET_CONFIG_CHANGED', (event) => {
      if (event.source === this.id && this.onConfigChange) {
        this.onConfigChange(event.payload.config);
      }
    });

    // Subscribe to data change events
    this.subscribeToEvents('WIDGET_DATA_CHANGED', (event) => {
      if (event.source === this.id && this.onDataChange) {
        this.onDataChange(event.payload.data);
      }
    });
  }
}
