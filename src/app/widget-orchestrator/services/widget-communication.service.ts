import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { WidgetCommunication, WidgetEvent } from '../interfaces';

/**
 * Widget Communication Service
 * Handles event-driven communication between widgets
 */
@Injectable({
  providedIn: 'root',
})
export class WidgetCommunicationService
  implements WidgetCommunication
{
  private readonly eventBus = new Subject<WidgetEvent>();
  private readonly channels = new Map<string, Subject<WidgetEvent>>();
  private readonly destroy$ = new Subject<void>();

  // Global state for shared data
  private readonly sharedState = new Map<
    string,
    BehaviorSubject<any>
  >();

  /**
   * Broadcast event to all widgets
   */
  broadcast(event: WidgetEvent): void {
    this.eventBus.next({
      ...event,
      timestamp: new Date(),
      bubble: true,
    });
  }

  /**
   * Send event to specific widget
   */
  send(targetId: string, event: WidgetEvent): void {
    const targetedEvent: WidgetEvent = {
      ...event,
      target: targetId,
      timestamp: new Date(),
      bubble: false,
    };

    this.eventBus.next(targetedEvent);
  }

  /**
   * Subscribe to events of specific type
   */
  subscribe(
    eventType: string,
    handler: (event: WidgetEvent) => void
  ): () => void {
    const subscription = this.eventBus
      .pipe(
        filter((event) => event.type === eventType),
        takeUntil(this.destroy$)
      )
      .subscribe(handler);

    return () => subscription.unsubscribe();
  }

  /**
   * Subscribe to events from specific widget
   */
  subscribeToWidget(
    sourceId: string,
    handler: (event: WidgetEvent) => void
  ): () => void {
    const subscription = this.eventBus
      .pipe(
        filter((event) => event.source === sourceId),
        takeUntil(this.destroy$)
      )
      .subscribe(handler);

    return () => subscription.unsubscribe();
  }

  /**
   * Subscribe to targeted events for specific widget
   */
  subscribeToTargetedEvents(
    targetId: string,
    handler: (event: WidgetEvent) => void
  ): () => void {
    const subscription = this.eventBus
      .pipe(
        filter((event) => event.target === targetId),
        takeUntil(this.destroy$)
      )
      .subscribe(handler);

    return () => subscription.unsubscribe();
  }

  /**
   * Create a communication channel between specific widgets
   */
  createChannel(channelId: string): Subject<WidgetEvent> {
    if (this.channels.has(channelId)) {
      return this.channels.get(channelId)!;
    }

    const channel = new Subject<WidgetEvent>();
    this.channels.set(channelId, channel);
    return channel;
  }

  /**
   * Get communication channel
   */
  getChannel(channelId: string): Subject<WidgetEvent> | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Close communication channel
   */
  closeChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.complete();
      this.channels.delete(channelId);
      return true;
    }
    return false;
  }

  /**
   * Get all events as observable
   */
  getAllEvents(): Observable<WidgetEvent> {
    return this.eventBus
      .asObservable()
      .pipe(takeUntil(this.destroy$));
  }

  /**
   * Set shared state value
   */
  setSharedState<T>(key: string, value: T): void {
    if (!this.sharedState.has(key)) {
      this.sharedState.set(key, new BehaviorSubject(value));
    } else {
      this.sharedState.get(key)!.next(value);
    }

    // Broadcast state change event
    this.broadcast({
      type: 'STATE_CHANGED',
      source: 'system',
      payload: { key, value },
      timestamp: new Date(),
      bubble: true,
    });
  }

  /**
   * Get shared state value
   */
  getSharedState<T>(key: string): T | undefined {
    const subject = this.sharedState.get(key);
    return subject ? subject.value : undefined;
  }

  /**
   * Subscribe to shared state changes
   */
  subscribeToSharedState<T>(key: string): Observable<T> {
    if (!this.sharedState.has(key)) {
      this.sharedState.set(key, new BehaviorSubject(undefined));
    }

    return this.sharedState
      .get(key)!
      .asObservable()
      .pipe(takeUntil(this.destroy$));
  }

  /**
   * Remove shared state
   */
  removeSharedState(key: string): boolean {
    const subject = this.sharedState.get(key);
    if (subject) {
      subject.complete();
      this.sharedState.delete(key);

      // Broadcast state removal event
      this.broadcast({
        type: 'STATE_REMOVED',
        source: 'system',
        payload: { key },
        timestamp: new Date(),
        bubble: true,
      });

      return true;
    }
    return false;
  }

  /**
   * Get all shared state keys
   */
  getSharedStateKeys(): string[] {
    return Array.from(this.sharedState.keys());
  }

  /**
   * Clear all shared state
   */
  clearSharedState(): void {
    this.sharedState.forEach((subject, key) => {
      subject.complete();
    });
    this.sharedState.clear();

    // Broadcast clear event
    this.broadcast({
      type: 'STATE_CLEARED',
      source: 'system',
      payload: {},
      timestamp: new Date(),
      bubble: true,
    });
  }

  /**
   * Request-response pattern for widget communication
   */
  async request<T>(
    targetId: string,
    requestType: string,
    payload?: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const timeoutMs = 5000; // 5 second timeout

      // Setup response handler
      const unsubscribe = this.subscribe(
        `${requestType}_RESPONSE`,
        (event) => {
          if (event.payload?.requestId === requestId) {
            unsubscribe();
            clearTimeout(timeout);

            if (event.payload.error) {
              reject(new Error(event.payload.error));
            } else {
              resolve(event.payload.data);
            }
          }
        }
      );

      // Setup timeout
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timeout: ${requestType}`));
      }, timeoutMs);

      // Send request
      this.send(targetId, {
        type: requestType,
        source: 'system',
        target: targetId,
        payload: { requestId, ...payload },
        timestamp: new Date(),
        bubble: false,
      });
    });
  }

  /**
   * Respond to a request
   */
  respond(
    requestEvent: WidgetEvent,
    responseData?: any,
    error?: string
  ): void {
    if (!requestEvent.payload?.requestId) {
      console.warn('Cannot respond to event without requestId');
      return;
    }

    this.send(requestEvent.source, {
      type: `${requestEvent.type}_RESPONSE`,
      source: 'system',
      target: requestEvent.source,
      payload: {
        requestId: requestEvent.payload.requestId,
        data: responseData,
        error,
      },
      timestamp: new Date(),
      bubble: false,
    });
  }

  /**
   * Get communication statistics
   */
  getStatistics(): {
    activeChannels: number;
    sharedStateKeys: number;
    channelIds: string[];
    stateKeys: string[];
  } {
    return {
      activeChannels: this.channels.size,
      sharedStateKeys: this.sharedState.size,
      channelIds: Array.from(this.channels.keys()),
      stateKeys: this.getSharedStateKeys(),
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Cleanup service
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Close all channels
    this.channels.forEach((channel, id) => {
      this.closeChannel(id);
    });

    // Clear shared state
    this.clearSharedState();
  }
}
