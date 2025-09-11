import {
  ComponentRef,
  Injectable,
  ViewContainerRef,
  inject,
} from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
} from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import {
  IWidget,
  WidgetConfig,
  WidgetDataProvider,
  WidgetDataSource,
  WidgetError,
  WidgetEvent,
  WidgetInstance,
  WidgetState,
} from '../interfaces';
import { WidgetRegistryService } from './widget-registry.service';

/**
 * Widget Orchestrator Service
 * Core service for managing widget lifecycle, data binding, and communication
 */
@Injectable({
  providedIn: 'root',
})
export class WidgetOrchestratorService {
  private readonly widgetRegistry = inject(WidgetRegistryService);
  private readonly instances = new Map<string, WidgetInstance>();
  private readonly componentRefs = new Map<
    string,
    ComponentRef<any>
  >();
  private readonly dataProviders = new Map<
    string,
    WidgetDataProvider
  >();
  private readonly subscriptions = new Map<string, Subscription>();

  // Event system
  private readonly eventBus = new Subject<WidgetEvent>();
  private readonly destroy$ = new Subject<void>();

  // State observables
  private readonly instancesSubject = new BehaviorSubject<
    WidgetInstance[]
  >([]);
  private readonly errorSubject = new Subject<{
    instanceId: string;
    error: WidgetError;
  }>();

  constructor() {
    // Setup event bus
    this.setupEventBus();
  }

  /**
   * Create a new widget instance
   */
  async createWidget(
    type: string,
    config: Partial<WidgetConfig>,
    container?: ViewContainerRef
  ): Promise<WidgetInstance> {
    try {
      // Get widget definition
      const definition = this.widgetRegistry.getWidget(type);
      if (!definition) {
        throw new Error(`Widget type '${type}' not found`);
      }

      // Check dependencies
      const depCheck = this.widgetRegistry.checkDependencies(type);
      if (!depCheck.satisfied) {
        throw new Error(
          `Missing widget dependencies: ${depCheck.missing.join(
            ', '
          )}`
        );
      }

      // Generate unique instance ID
      const instanceId = this.generateInstanceId(type);

      // Merge configuration with defaults
      const widgetConfig: WidgetConfig = {
        ...definition.defaultConfig,
        ...config,
        type,
      } as WidgetConfig;

      // Create widget instance
      const instance: WidgetInstance = {
        id: instanceId,
        definition,
        config: widgetConfig,
        state: WidgetState.INITIALIZING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store instance
      this.instances.set(instanceId, instance);

      // Load and create component if container provided
      if (container) {
        await this.loadWidgetComponent(instance, container);
      }

      // Update state
      this.updateInstanceState(instanceId, WidgetState.LOADED);
      this.notifyInstancesChange();

      return instance;
    } catch (error) {
      const widgetError: WidgetError = {
        code: 'CREATION_FAILED',
        message: `Failed to create widget: ${error}`,
        timestamp: new Date(),
        recoverable: false,
      };

      this.errorSubject.next({ instanceId: '', error: widgetError });
      throw error;
    }
  }

  /**
   * Load widget component into container
   */
  async loadWidgetComponent(
    instance: WidgetInstance,
    container: ViewContainerRef
  ): Promise<ComponentRef<any>> {
    try {
      this.updateInstanceState(instance.id, WidgetState.LOADING);

      // Load component class
      const componentType = await this.widgetRegistry.loadComponent(
        instance.definition.type
      );

      // Create component
      const componentRef = container.createComponent(componentType);

      // Configure component if it implements IWidget
      const component = componentRef.instance;
      if (this.isWidgetComponent(component)) {
        component.id = instance.id;
        component.config = instance.config;

        // Set initial data
        if (instance.data) {
          component.data = instance.data;
        }

        // Setup component lifecycle hooks
        if (component.onInit) {
          component.onInit();
        }

        // Setup event handling
        if (component.emit) {
          component.emit = (event: WidgetEvent) =>
            this.emitEvent(instance.id, event);
        }

        // Setup configuration change handling
        if (component.onConfigChange) {
          component.onConfigChange = (
            config: Partial<WidgetConfig>
          ) => this.updateWidgetConfig(instance.id, config);
        }
      }

      // Store component reference
      this.componentRefs.set(instance.id, componentRef);

      // Setup data binding if configured
      if (instance.config.dataSource) {
        await this.setupDataBinding(instance);
      }

      this.updateInstanceState(instance.id, WidgetState.LOADED);
      return componentRef;
    } catch (error) {
      this.handleWidgetError(instance.id, {
        code: 'LOAD_FAILED',
        message: `Failed to load widget component: ${error}`,
        timestamp: new Date(),
        recoverable: true,
      });
      throw error;
    }
  }

  /**
   * Destroy widget instance
   */
  destroyWidget(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    try {
      // Clean up component
      const componentRef = this.componentRefs.get(instanceId);
      if (componentRef) {
        const component = componentRef.instance;

        // Call onDestroy if available
        if (
          this.isWidgetComponent(component) &&
          component.onDestroy
        ) {
          component.onDestroy();
        }

        // Destroy component
        componentRef.destroy();
        this.componentRefs.delete(instanceId);
      }

      // Clean up subscriptions
      const subscription = this.subscriptions.get(instanceId);
      if (subscription) {
        subscription.unsubscribe();
        this.subscriptions.delete(instanceId);
      }

      // Update state and remove instance
      this.updateInstanceState(instanceId, WidgetState.DESTROYED);
      this.instances.delete(instanceId);

      this.notifyInstancesChange();
      return true;
    } catch (error) {
      this.handleWidgetError(instanceId, {
        code: 'DESTROY_FAILED',
        message: `Failed to destroy widget: ${error}`,
        timestamp: new Date(),
        recoverable: false,
      });
      return false;
    }
  }

  /**
   * Update widget configuration
   */
  updateWidgetConfig(
    instanceId: string,
    config: Partial<WidgetConfig>
  ): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    try {
      // Update configuration
      instance.config = { ...instance.config, ...config };
      instance.updatedAt = new Date();

      // Update component if available
      const componentRef = this.componentRefs.get(instanceId);
      if (componentRef) {
        const component = componentRef.instance;
        if (this.isWidgetComponent(component)) {
          component.config = instance.config;

          if (component.onConfigChange) {
            component.onConfigChange(config);
          }
        }
      }

      this.notifyInstancesChange();
      return true;
    } catch (error) {
      this.handleWidgetError(instanceId, {
        code: 'CONFIG_UPDATE_FAILED',
        message: `Failed to update widget configuration: ${error}`,
        timestamp: new Date(),
        recoverable: true,
      });
      return false;
    }
  }

  /**
   * Update widget data
   */
  updateWidgetData(instanceId: string, data: any): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    try {
      // Update data
      instance.data = data;
      instance.updatedAt = new Date();

      // Update component if available
      const componentRef = this.componentRefs.get(instanceId);
      if (componentRef) {
        const component = componentRef.instance;
        if (this.isWidgetComponent(component)) {
          component.data = data;

          if (component.onDataChange) {
            component.onDataChange(data);
          }
        }
      }

      return true;
    } catch (error) {
      this.handleWidgetError(instanceId, {
        code: 'DATA_UPDATE_FAILED',
        message: `Failed to update widget data: ${error}`,
        timestamp: new Date(),
        recoverable: true,
      });
      return false;
    }
  }

  /**
   * Get widget instance
   */
  getWidget(instanceId: string): WidgetInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Get all widget instances
   */
  getAllWidgets(): WidgetInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get widgets by type
   */
  getWidgetsByType(type: string): WidgetInstance[] {
    return this.getAllWidgets().filter(
      (instance) => instance.definition.type === type
    );
  }

  /**
   * Get widget component reference
   */
  getWidgetComponent(
    instanceId: string
  ): ComponentRef<any> | undefined {
    return this.componentRefs.get(instanceId);
  }

  /**
   * Emit event from widget
   */
  emitEvent(sourceId: string, event: Partial<WidgetEvent>): void {
    const fullEvent: WidgetEvent = {
      type: event.type || 'custom',
      source: sourceId,
      target: event.target,
      payload: event.payload,
      timestamp: new Date(),
      bubble: event.bubble ?? true,
    };

    this.eventBus.next(fullEvent);
  }

  /**
   * Subscribe to widget events
   */
  subscribeToEvents(eventType?: string): Observable<WidgetEvent> {
    let stream = this.eventBus.asObservable();

    if (eventType) {
      stream = stream.pipe(
        filter((event) => event.type === eventType)
      );
    }

    return stream.pipe(takeUntil(this.destroy$));
  }

  /**
   * Subscribe to events from specific widget
   */
  subscribeToWidget(sourceId: string): Observable<WidgetEvent> {
    return this.eventBus.asObservable().pipe(
      filter((event) => event.source === sourceId),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Get instances as observable
   */
  getInstances$(): Observable<WidgetInstance[]> {
    return this.instancesSubject.asObservable();
  }

  /**
   * Get errors as observable
   */
  getErrors$(): Observable<{
    instanceId: string;
    error: WidgetError;
  }> {
    return this.errorSubject.asObservable();
  }

  /**
   * Register data provider
   */
  registerDataProvider(provider: WidgetDataProvider): void {
    this.dataProviders.set(provider.name, provider);
  }

  /**
   * Unregister data provider
   */
  unregisterDataProvider(name: string): boolean {
    return this.dataProviders.delete(name);
  }

  /**
   * Setup data binding for widget
   */
  private async setupDataBinding(
    instance: WidgetInstance
  ): Promise<void> {
    if (!instance.config.dataSource) {
      return;
    }

    const dataSource = instance.config.dataSource;
    const provider = this.findDataProvider(dataSource);

    if (!provider) {
      throw new Error(
        `No data provider found for type: ${dataSource.type}`
      );
    }

    try {
      const subscription = provider.getData(dataSource).subscribe({
        next: (data) => this.updateWidgetData(instance.id, data),
        error: (error) =>
          this.handleWidgetError(instance.id, {
            code: 'DATA_FETCH_FAILED',
            message: `Failed to fetch data: ${error}`,
            timestamp: new Date(),
            recoverable: true,
          }),
      });

      this.subscriptions.set(instance.id, subscription);
    } catch (error) {
      throw new Error(`Failed to setup data binding: ${error}`);
    }
  }

  /**
   * Find appropriate data provider
   */
  private findDataProvider(
    dataSource: WidgetDataSource
  ): WidgetDataProvider | undefined {
    return Array.from(this.dataProviders.values()).find((provider) =>
      provider.supports(dataSource)
    );
  }

  /**
   * Setup event bus
   */
  private setupEventBus(): void {
    this.eventBus
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        // Handle targeted events
        if (event.target) {
          const componentRef = this.componentRefs.get(event.target);
          if (componentRef) {
            const component = componentRef.instance;
            if (
              this.isWidgetComponent(component) &&
              component.onEvent
            ) {
              component.onEvent(event);
            }
          }
        }

        // Handle bubbling events
        if (event.bubble) {
          this.componentRefs.forEach((componentRef, instanceId) => {
            if (instanceId !== event.source) {
              const component = componentRef.instance;
              if (
                this.isWidgetComponent(component) &&
                component.onEvent
              ) {
                component.onEvent(event);
              }
            }
          });
        }
      });
  }

  /**
   * Check if component implements IWidget interface
   */
  private isWidgetComponent(component: any): component is IWidget {
    return component && typeof component === 'object';
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * Update instance state
   */
  private updateInstanceState(
    instanceId: string,
    state: WidgetState
  ): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.state = state;
      instance.updatedAt = new Date();
    }
  }

  /**
   * Handle widget error
   */
  private handleWidgetError(
    instanceId: string,
    error: WidgetError
  ): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.error = error;
      instance.state = WidgetState.ERROR;
      instance.updatedAt = new Date();
    }

    this.errorSubject.next({ instanceId, error });
    this.notifyInstancesChange();
  }

  /**
   * Notify instances change
   */
  private notifyInstancesChange(): void {
    this.instancesSubject.next(this.getAllWidgets());
  }

  /**
   * Cleanup service
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Destroy all widgets
    this.getAllWidgets().forEach((instance) => {
      this.destroyWidget(instance.id);
    });

    // Clear subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }
}
