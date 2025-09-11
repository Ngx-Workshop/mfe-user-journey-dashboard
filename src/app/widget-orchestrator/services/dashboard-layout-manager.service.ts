import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import {
  DashboardConfig,
  WidgetInstance,
  WidgetLayout,
} from '../interfaces';

export interface GridBreakpoint {
  name: string;
  query: string;
  cols: number;
  rowHeight: number;
  margin: number;
}

export interface LayoutChange {
  type: 'resize' | 'move' | 'add' | 'remove';
  instanceId: string;
  layout: WidgetLayout;
  previousLayout?: WidgetLayout;
}

/**
 * Dashboard Layout Manager Service
 * Manages widget layout, grid positioning, persistence, and responsive behavior
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardLayoutManagerService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  // Default grid configuration
  private readonly defaultGridConfig = {
    cols: 12,
    rowHeight: 100,
    margin: 10,
    outerMargin: 10,
    responsive: true,
  };

  // Breakpoint definitions
  private readonly breakpoints: GridBreakpoint[] = [
    {
      name: 'xs',
      query: Breakpoints.XSmall,
      cols: 1,
      rowHeight: 100,
      margin: 8,
    },
    {
      name: 'sm',
      query: Breakpoints.Small,
      cols: 2,
      rowHeight: 100,
      margin: 10,
    },
    {
      name: 'md',
      query: Breakpoints.Medium,
      cols: 6,
      rowHeight: 100,
      margin: 12,
    },
    {
      name: 'lg',
      query: Breakpoints.Large,
      cols: 12,
      rowHeight: 100,
      margin: 15,
    },
    {
      name: 'xl',
      query: Breakpoints.XLarge,
      cols: 12,
      rowHeight: 120,
      margin: 20,
    },
  ];

  // State management
  private readonly dashboardConfig =
    new BehaviorSubject<DashboardConfig>({
      id: 'default',
      title: 'Dashboard',
      grid: this.defaultGridConfig,
      widgets: [],
    });

  private readonly layoutChanges = new BehaviorSubject<
    LayoutChange[]
  >([]);
  private readonly currentBreakpoint =
    new BehaviorSubject<GridBreakpoint>(this.breakpoints[3]);

  constructor() {
    this.setupResponsiveBreakpoints();
  }

  /**
   * Get current dashboard configuration
   */
  getDashboardConfig(): DashboardConfig {
    return this.dashboardConfig.value;
  }

  /**
   * Get dashboard configuration as observable
   */
  getDashboardConfig$(): Observable<DashboardConfig> {
    return this.dashboardConfig.asObservable();
  }

  /**
   * Update dashboard configuration
   */
  updateDashboardConfig(config: Partial<DashboardConfig>): void {
    const currentConfig = this.dashboardConfig.value;
    const updatedConfig = { ...currentConfig, ...config };
    this.dashboardConfig.next(updatedConfig);
  }

  /**
   * Add widget to dashboard
   */
  addWidget(
    instance: WidgetInstance,
    position?: { x: number; y: number }
  ): void {
    const config = this.dashboardConfig.value;
    const updatedWidgets = [...config.widgets];

    // Find optimal position if not specified
    if (!position) {
      position = this.findOptimalPosition(instance.config.layout);
    }

    // Update widget layout with position
    instance.config.layout = {
      ...instance.config.layout,
      x: position.x,
      y: position.y,
    };

    updatedWidgets.push(instance);

    this.updateDashboardConfig({ widgets: updatedWidgets });

    // Record layout change
    this.recordLayoutChange({
      type: 'add',
      instanceId: instance.id,
      layout: instance.config.layout,
    });
  }

  /**
   * Remove widget from dashboard
   */
  removeWidget(instanceId: string): boolean {
    const config = this.dashboardConfig.value;
    const widgetIndex = config.widgets.findIndex(
      (w) => w.id === instanceId
    );

    if (widgetIndex === -1) {
      return false;
    }

    const widget = config.widgets[widgetIndex];
    const updatedWidgets = config.widgets.filter(
      (w) => w.id !== instanceId
    );

    this.updateDashboardConfig({ widgets: updatedWidgets });

    // Record layout change
    this.recordLayoutChange({
      type: 'remove',
      instanceId,
      layout: widget.config.layout,
    });

    return true;
  }

  /**
   * Update widget layout
   */
  updateWidgetLayout(
    instanceId: string,
    layout: Partial<WidgetLayout>
  ): boolean {
    const config = this.dashboardConfig.value;
    const widget = config.widgets.find((w) => w.id === instanceId);

    if (!widget) {
      return false;
    }

    const previousLayout = { ...widget.config.layout };
    const updatedLayout = { ...widget.config.layout, ...layout };

    // Validate layout
    if (!this.validateLayout(updatedLayout)) {
      return false;
    }

    // Check for overlaps
    if (this.hasOverlap(instanceId, updatedLayout)) {
      // Try to resolve overlaps
      const resolvedLayout = this.resolveOverlaps(
        instanceId,
        updatedLayout
      );
      if (resolvedLayout) {
        widget.config.layout = resolvedLayout;
      } else {
        return false; // Could not resolve overlaps
      }
    } else {
      widget.config.layout = updatedLayout;
    }

    this.dashboardConfig.next(config);

    // Record layout change
    this.recordLayoutChange({
      type:
        layout.x !== undefined || layout.y !== undefined
          ? 'move'
          : 'resize',
      instanceId,
      layout: widget.config.layout,
      previousLayout,
    });

    return true;
  }

  /**
   * Get widget layout
   */
  getWidgetLayout(instanceId: string): WidgetLayout | undefined {
    const config = this.dashboardConfig.value;
    const widget = config.widgets.find((w) => w.id === instanceId);
    return widget?.config.layout;
  }

  /**
   * Get current grid configuration
   */
  getGridConfig(): DashboardConfig['grid'] {
    return this.dashboardConfig.value.grid;
  }

  /**
   * Update grid configuration
   */
  updateGridConfig(
    gridConfig: Partial<DashboardConfig['grid']>
  ): void {
    const currentConfig = this.dashboardConfig.value;
    const updatedGrid = { ...currentConfig.grid, ...gridConfig };
    this.updateDashboardConfig({ grid: updatedGrid });
  }

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint(): GridBreakpoint {
    return this.currentBreakpoint.value;
  }

  /**
   * Get current breakpoint as observable
   */
  getCurrentBreakpoint$(): Observable<GridBreakpoint> {
    return this.currentBreakpoint.asObservable();
  }

  /**
   * Optimize layout for current breakpoint
   */
  optimizeLayoutForBreakpoint(): void {
    const breakpoint = this.currentBreakpoint.value;
    const config = this.dashboardConfig.value;

    const optimizedWidgets = config.widgets.map((widget) => {
      const layout = this.optimizeWidgetForBreakpoint(
        widget.config.layout,
        breakpoint
      );
      return {
        ...widget,
        config: { ...widget.config, layout },
      };
    });

    this.updateDashboardConfig({ widgets: optimizedWidgets });
  }

  /**
   * Compact layout to remove gaps
   */
  compactLayout(): void {
    const config = this.dashboardConfig.value;
    const sortedWidgets = [...config.widgets].sort((a, b) => {
      const layoutA = a.config.layout;
      const layoutB = b.config.layout;

      // Sort by y position first, then by x position
      if (layoutA.y !== layoutB.y) {
        return (layoutA.y || 0) - (layoutB.y || 0);
      }
      return (layoutA.x || 0) - (layoutB.x || 0);
    });

    const compactedWidgets = this.compactWidgets(sortedWidgets);
    this.updateDashboardConfig({ widgets: compactedWidgets });
  }

  /**
   * Save dashboard layout to storage
   */
  saveLayout(storageKey = 'dashboard-layout'): void {
    const config = this.dashboardConfig.value;
    const layoutData = {
      config,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(layoutData));
    } catch (error) {
      console.warn('Failed to save dashboard layout:', error);
    }
  }

  /**
   * Load dashboard layout from storage
   */
  loadLayout(storageKey = 'dashboard-layout'): boolean {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const layoutData = JSON.parse(stored);
        this.dashboardConfig.next(layoutData.config);
        return true;
      }
    } catch (error) {
      console.warn('Failed to load dashboard layout:', error);
    }

    return false;
  }

  /**
   * Get layout changes history
   */
  getLayoutChanges$(): Observable<LayoutChange[]> {
    return this.layoutChanges.asObservable();
  }

  /**
   * Clear layout changes history
   */
  clearLayoutHistory(): void {
    this.layoutChanges.next([]);
  }

  /**
   * Export dashboard configuration
   */
  exportDashboard(): string {
    const config = this.dashboardConfig.value;
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import dashboard configuration
   */
  importDashboard(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson) as DashboardConfig;
      this.validateDashboardConfig(config);
      this.dashboardConfig.next(config);
      return true;
    } catch (error) {
      console.error('Failed to import dashboard:', error);
      return false;
    }
  }

  /**
   * Setup responsive breakpoints
   */
  private setupResponsiveBreakpoints(): void {
    const breakpointQueries = this.breakpoints.map((bp) => bp.query);

    combineLatest(
      breakpointQueries.map((query) =>
        this.breakpointObserver.observe(query)
      )
    )
      .pipe(
        map((results) => {
          // Find the active breakpoint
          const activeIndex = results.findIndex(
            (result) => result.matches
          );
          return activeIndex >= 0
            ? this.breakpoints[activeIndex]
            : this.breakpoints[3]; // Default to large
        }),
        distinctUntilChanged((a, b) => a.name === b.name)
      )
      .subscribe((breakpoint) => {
        this.currentBreakpoint.next(breakpoint);

        // Update grid configuration for new breakpoint
        this.updateGridConfig({
          cols: breakpoint.cols,
          rowHeight: breakpoint.rowHeight,
          margin: breakpoint.margin,
        });

        // Optimize layout for new breakpoint
        if (this.getDashboardConfig().grid.responsive) {
          this.optimizeLayoutForBreakpoint();
        }
      });
  }

  /**
   * Find optimal position for new widget
   */
  private findOptimalPosition(layout: WidgetLayout): {
    x: number;
    y: number;
  } {
    const config = this.dashboardConfig.value;
    const gridCols = config.grid.cols;

    // Try to place at the top-left first
    for (let y = 0; y < 1000; y++) {
      for (let x = 0; x <= gridCols - layout.cols; x++) {
        const testLayout = { ...layout, x, y };
        if (!this.hasOverlap('', testLayout)) {
          return { x, y };
        }
      }
    }

    // Fallback to bottom of grid
    const maxY = Math.max(
      0,
      ...config.widgets.map(
        (w) => (w.config.layout.y || 0) + w.config.layout.rows
      )
    );
    return { x: 0, y: maxY };
  }

  /**
   * Check if layout has overlaps with existing widgets
   */
  private hasOverlap(
    excludeInstanceId: string,
    layout: WidgetLayout
  ): boolean {
    const config = this.dashboardConfig.value;
    const widgets = config.widgets.filter(
      (w) => w.id !== excludeInstanceId
    );

    const x1 = layout.x || 0;
    const y1 = layout.y || 0;
    const x2 = x1 + layout.cols;
    const y2 = y1 + layout.rows;

    return widgets.some((widget) => {
      const wLayout = widget.config.layout;
      const wx1 = wLayout.x || 0;
      const wy1 = wLayout.y || 0;
      const wx2 = wx1 + wLayout.cols;
      const wy2 = wy1 + wLayout.rows;

      return !(x2 <= wx1 || x1 >= wx2 || y2 <= wy1 || y1 >= wy2);
    });
  }

  /**
   * Resolve layout overlaps
   */
  private resolveOverlaps(
    instanceId: string,
    layout: WidgetLayout
  ): WidgetLayout | null {
    // Try to find alternative position nearby
    const originalX = layout.x || 0;
    const originalY = layout.y || 0;

    // Search in expanding radius around original position
    for (let radius = 1; radius <= 10; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const testLayout = {
              ...layout,
              x: Math.max(0, originalX + dx),
              y: Math.max(0, originalY + dy),
            };

            if (
              this.validateLayout(testLayout) &&
              !this.hasOverlap(instanceId, testLayout)
            ) {
              return testLayout;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Validate widget layout
   */
  private validateLayout(layout: WidgetLayout): boolean {
    const config = this.dashboardConfig.value;
    const gridCols = config.grid.cols;

    // Check bounds
    if ((layout.x || 0) < 0 || (layout.y || 0) < 0) {
      return false;
    }

    if ((layout.x || 0) + layout.cols > gridCols) {
      return false;
    }

    // Check minimum/maximum constraints
    if (layout.minCols && layout.cols < layout.minCols) {
      return false;
    }

    if (layout.maxCols && layout.cols > layout.maxCols) {
      return false;
    }

    if (layout.minRows && layout.rows < layout.minRows) {
      return false;
    }

    if (layout.maxRows && layout.rows > layout.maxRows) {
      return false;
    }

    return true;
  }

  /**
   * Optimize widget layout for breakpoint
   */
  private optimizeWidgetForBreakpoint(
    layout: WidgetLayout,
    breakpoint: GridBreakpoint
  ): WidgetLayout {
    // Adjust columns to fit breakpoint
    const maxCols = Math.min(layout.cols, breakpoint.cols);
    const adjustedCols = Math.max(1, maxCols);

    // Adjust position to fit grid
    const adjustedX = Math.min(
      layout.x || 0,
      Math.max(0, breakpoint.cols - adjustedCols)
    );

    return {
      ...layout,
      cols: adjustedCols,
      x: adjustedX,
    };
  }

  /**
   * Compact widgets to remove gaps
   */
  private compactWidgets(
    widgets: WidgetInstance[]
  ): WidgetInstance[] {
    const gridCols = this.dashboardConfig.value.grid.cols;
    const occupiedPositions = new Set<string>();

    return widgets.map((widget) => {
      const layout = widget.config.layout;
      const optimalPosition = this.findCompactPosition(
        layout,
        gridCols,
        occupiedPositions
      );

      // Mark positions as occupied
      for (
        let x = optimalPosition.x;
        x < optimalPosition.x + layout.cols;
        x++
      ) {
        for (
          let y = optimalPosition.y;
          y < optimalPosition.y + layout.rows;
          y++
        ) {
          occupiedPositions.add(`${x},${y}`);
        }
      }

      return {
        ...widget,
        config: {
          ...widget.config,
          layout: { ...layout, ...optimalPosition },
        },
      };
    });
  }

  /**
   * Find compact position for widget
   */
  private findCompactPosition(
    layout: WidgetLayout,
    gridCols: number,
    occupiedPositions: Set<string>
  ): { x: number; y: number } {
    for (let y = 0; y < 1000; y++) {
      for (let x = 0; x <= gridCols - layout.cols; x++) {
        let canPlace = true;

        // Check if position is available
        for (
          let checkX = x;
          checkX < x + layout.cols && canPlace;
          checkX++
        ) {
          for (
            let checkY = y;
            checkY < y + layout.rows && canPlace;
            checkY++
          ) {
            if (occupiedPositions.has(`${checkX},${checkY}`)) {
              canPlace = false;
            }
          }
        }

        if (canPlace) {
          return { x, y };
        }
      }
    }

    return { x: 0, y: 0 };
  }

  /**
   * Record layout change
   */
  private recordLayoutChange(change: LayoutChange): void {
    const changes = this.layoutChanges.value;
    const updatedChanges = [
      ...changes,
      { ...change, timestamp: new Date() } as any,
    ];

    // Keep only last 100 changes
    if (updatedChanges.length > 100) {
      updatedChanges.splice(0, updatedChanges.length - 100);
    }

    this.layoutChanges.next(updatedChanges);
  }

  /**
   * Validate dashboard configuration
   */
  private validateDashboardConfig(config: DashboardConfig): void {
    if (
      !config.id ||
      !config.title ||
      !config.grid ||
      !Array.isArray(config.widgets)
    ) {
      throw new Error('Invalid dashboard configuration');
    }
  }
}
