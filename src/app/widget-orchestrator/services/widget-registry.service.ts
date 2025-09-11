import { Injectable, Type } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  WidgetDefinition,
  WidgetRegistryConfig,
} from '../interfaces';

/**
 * Widget Registry Service
 * Manages registration, discovery, and lazy loading of widgets
 */
@Injectable({
  providedIn: 'root',
})
export class WidgetRegistryService {
  private readonly widgets = new Map<string, WidgetDefinition>();
  private readonly categories = new Map<string, WidgetDefinition[]>();
  private readonly widgetSubject = new BehaviorSubject<
    WidgetDefinition[]
  >([]);
  private readonly config: WidgetRegistryConfig;

  constructor() {
    this.config = {
      lazyLoading: true,
      cache: true,
      hotReload: false,
      discoveryPaths: [],
    };
  }

  /**
   * Register a widget definition
   */
  register(definition: WidgetDefinition): void {
    if (this.widgets.has(definition.type)) {
      console.warn(
        `Widget type '${definition.type}' is already registered. Overwriting...`
      );
    }

    // Validate widget definition
    this.validateDefinition(definition);

    // Register widget
    this.widgets.set(definition.type, definition);

    // Update category mapping
    this.updateCategoryMapping(definition);

    // Notify subscribers
    this.notifyChange();
  }

  /**
   * Register multiple widgets
   */
  registerMany(definitions: WidgetDefinition[]): void {
    definitions.forEach((definition) => this.register(definition));
  }

  /**
   * Unregister a widget
   */
  unregister(type: string): boolean {
    const definition = this.widgets.get(type);
    if (!definition) {
      return false;
    }

    this.widgets.delete(type);
    this.removeCategoryMapping(definition);
    this.notifyChange();
    return true;
  }

  /**
   * Get widget definition by type
   */
  getWidget(type: string): WidgetDefinition | undefined {
    return this.widgets.get(type);
  }

  /**
   * Get all registered widgets
   */
  getAllWidgets(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets by category
   */
  getWidgetsByCategory(category: string): WidgetDefinition[] {
    return this.categories.get(category) || [];
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Search widgets by tags
   */
  searchByTags(tags: string[]): WidgetDefinition[] {
    return this.getAllWidgets().filter((widget) =>
      widget.tags?.some((tag) => tags.includes(tag))
    );
  }

  /**
   * Search widgets by name or description
   */
  search(query: string): WidgetDefinition[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllWidgets().filter(
      (widget) =>
        widget.name.toLowerCase().includes(lowercaseQuery) ||
        widget.description.toLowerCase().includes(lowercaseQuery) ||
        widget.tags?.some((tag) =>
          tag.toLowerCase().includes(lowercaseQuery)
        )
    );
  }

  /**
   * Load widget component (handles lazy loading)
   */
  async loadComponent(type: string): Promise<Type<any>> {
    const definition = this.getWidget(type);
    if (!definition) {
      throw new Error(`Widget type '${type}' not found`);
    }

    try {
      // If lazy loading is enabled and loadComponent function exists
      if (
        this.config.lazyLoading &&
        definition.lazy &&
        definition.loadComponent
      ) {
        return await definition.loadComponent();
      }

      // Return direct component reference
      return definition.component;
    } catch (error) {
      throw new Error(
        `Failed to load widget component '${type}': ${error}`
      );
    }
  }

  /**
   * Check if widget type exists
   */
  hasWidget(type: string): boolean {
    return this.widgets.has(type);
  }

  /**
   * Check widget dependencies
   */
  checkDependencies(type: string): {
    satisfied: boolean;
    missing: string[];
  } {
    const definition = this.getWidget(type);
    if (!definition || !definition.dependencies) {
      return { satisfied: true, missing: [] };
    }

    const missing = definition.dependencies.filter(
      (dep) => !this.hasWidget(dep)
    );
    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  /**
   * Get widgets as observable
   */
  getWidgets$(): Observable<WidgetDefinition[]> {
    return this.widgetSubject.asObservable();
  }

  /**
   * Get widgets by category as observable
   */
  getWidgetsByCategory$(
    category: string
  ): Observable<WidgetDefinition[]> {
    return this.widgetSubject.pipe(
      map(() => this.getWidgetsByCategory(category))
    );
  }

  /**
   * Validate widget definition
   */
  private validateDefinition(definition: WidgetDefinition): void {
    if (!definition.type) {
      throw new Error('Widget definition must have a type');
    }

    if (!definition.name) {
      throw new Error('Widget definition must have a name');
    }

    if (
      !definition.component &&
      (!definition.lazy || !definition.loadComponent)
    ) {
      throw new Error(
        'Widget definition must have a component or lazy loading function'
      );
    }

    if (!definition.category) {
      throw new Error('Widget definition must have a category');
    }

    if (!definition.defaultConfig) {
      throw new Error(
        'Widget definition must have default configuration'
      );
    }
  }

  /**
   * Update category mapping
   */
  private updateCategoryMapping(definition: WidgetDefinition): void {
    if (!this.categories.has(definition.category)) {
      this.categories.set(definition.category, []);
    }

    const categoryWidgets = this.categories.get(definition.category)!;
    const existingIndex = categoryWidgets.findIndex(
      (w) => w.type === definition.type
    );

    if (existingIndex >= 0) {
      categoryWidgets[existingIndex] = definition;
    } else {
      categoryWidgets.push(definition);
    }
  }

  /**
   * Remove from category mapping
   */
  private removeCategoryMapping(definition: WidgetDefinition): void {
    const categoryWidgets = this.categories.get(definition.category);
    if (categoryWidgets) {
      const index = categoryWidgets.findIndex(
        (w) => w.type === definition.type
      );
      if (index >= 0) {
        categoryWidgets.splice(index, 1);
      }

      // Remove category if empty
      if (categoryWidgets.length === 0) {
        this.categories.delete(definition.category);
      }
    }
  }

  /**
   * Notify subscribers of changes
   */
  private notifyChange(): void {
    this.widgetSubject.next(this.getAllWidgets());
  }

  /**
   * Export widget registry (for backup/migration)
   */
  export(): { widgets: WidgetDefinition[]; categories: string[] } {
    return {
      widgets: this.getAllWidgets(),
      categories: this.getCategories(),
    };
  }

  /**
   * Import widget registry (for backup/migration)
   */
  import(data: { widgets: WidgetDefinition[] }): void {
    this.widgets.clear();
    this.categories.clear();

    if (data.widgets) {
      this.registerMany(data.widgets);
    }
  }

  /**
   * Clear all registered widgets
   */
  clear(): void {
    this.widgets.clear();
    this.categories.clear();
    this.notifyChange();
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalWidgets: number;
    categories: number;
    lazyWidgets: number;
    widgetsByCategory: Record<string, number>;
  } {
    const widgets = this.getAllWidgets();
    const categoryCounts: Record<string, number> = {};

    this.getCategories().forEach((category) => {
      categoryCounts[category] =
        this.getWidgetsByCategory(category).length;
    });

    return {
      totalWidgets: widgets.length,
      categories: this.getCategories().length,
      lazyWidgets: widgets.filter((w) => w.lazy).length,
      widgetsByCategory: categoryCounts,
    };
  }
}
