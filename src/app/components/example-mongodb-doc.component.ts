import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExampleMongodbDocDto } from '@tmdjr/seed-service-nestjs-contracts';

@Component({
  selector: 'ngx-example-mongodb-doc',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatMenuModule,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title class="title-row">
          <span class="title-text" [matTooltip]="doc.name">{{
            doc.name
          }}</span>

          <button
            mat-icon-button
            [matMenuTriggerFor]="menu"
            aria-label="More actions"
          >
            <mat-icon>more_vert</mat-icon>
          </button>
        </mat-card-title>
        <mat-card-subtitle>
          <mat-chip-set>
            <mat-chip
              appearance="outlined"
              color="primary"
              matTooltip="Type"
              >{{ $any(doc).type || '—' }}</mat-chip
            >
            <mat-chip
              appearance="outlined"
              [color]="$any(doc).archived ? 'warn' : undefined"
              matTooltip="Archived status"
            >
              {{ $any(doc).archived ? 'Archived' : 'Active' }}
            </mat-chip>
          </mat-chip-set>
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="meta">
          <code>ID:</code> {{ doc._id }}
          <button
            mat-icon-button
            (click)="copyId()"
            matTooltip="Copy ID"
            aria-label="Copy ID"
          >
            <mat-icon>content_copy</mat-icon>
          </button>
        </div>

        @if (doc.description) {
        <p class="desc">
          {{ doc.description }}
        </p>
        } @if(doc.exampleMongodbDocObject) {
        <div class="address">
          <pre><code>{{ doc.exampleMongodbDocObject | json }}</code></pre>
        </div>
        }
      </mat-card-content>
    </mat-card>

    <mat-menu #menu="matMenu">
      <button mat-menu-item (click)="edit.emit(doc)">
        <mat-icon>edit</mat-icon>
        <span>Edit</span>
      </button>
      <button mat-menu-item (click)="remove.emit(doc)">
        <mat-icon>delete</mat-icon>
        <span>Delete</span>
      </button>
    </mat-menu>
  `,
  styles: [
    `
      .title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .title-text {
        display: inline-block;
        max-width: 85%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .meta {
        opacity: 0.75;
        font-size: 0.85rem;
        margin-top: 0.5rem;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .desc {
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .mat-mdc-card-header {
        display: block;
      }
      pre {
        color: var(--mat-sys-on-primary-container);
        background: var(--mat-sys-primary-container);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleMongodbDocComponent {
  @Input({ required: true }) doc!: ExampleMongodbDocDto;
  @Output() edit = new EventEmitter<ExampleMongodbDocDto>();
  @Output() remove = new EventEmitter<ExampleMongodbDocDto>();

  async copyId() {
    try {
      await navigator.clipboard.writeText(String(this.doc._id));
    } catch {}
  }
}
