import { NgModule } from '@angular/core';
import { NgxExplorerContainerDirective } from './directives/ngx-explorer-container.directive';
import { NgxExplorerItemDirective } from './directives/ngx-explorer-item.directive';
import { NgxExplorerTargetDirective } from './directives/ngx-explorer-target.directive';
import { NgxDragSelectionDirective } from './directives/ngx-drag-selection.directive';

@NgModule({
  declarations: [
    NgxExplorerContainerDirective,
    NgxExplorerItemDirective,
    NgxExplorerTargetDirective,
    NgxDragSelectionDirective,
  ],
  imports: [],
  exports: [
    NgxExplorerItemDirective,
    NgxExplorerContainerDirective,
    NgxExplorerTargetDirective,
    NgxDragSelectionDirective,
  ],
})
export class NgxExplorerDndModule {}
