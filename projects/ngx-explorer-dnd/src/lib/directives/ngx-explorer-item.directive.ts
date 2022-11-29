import {
  Directive,
  ElementRef,
  Inject,
  Input,
  Optional,
  SkipSelf,
} from '@angular/core';
import { FileFolder } from '../core/file-folder';
import {
  EXPLORER_DND_CONTAINER,
  NgxExplorerContainerDirective,
} from './ngx-explorer-container.directive';

@Directive({
  selector: '[ngxExplorerDndElement]',
  providers: [
    {
      provide: EXPLORER_DND_CONTAINER,
      useExisting: NgxExplorerItemDirective,
    },
  ],
})
export class NgxExplorerItemDirective<T = any> {
  /** The host HTMLElement */
  htmlElement!: HTMLElement;

  /** Optional drag data. */
  @Input('DndElementData') data!: T;

  constructor(
    private elementRef: ElementRef,
    @Optional()
    @SkipSelf()
    @Inject(EXPLORER_DND_CONTAINER)
    private _parentDrag?: NgxExplorerContainerDirective,
    @Optional()
    private host?: FileFolder
  ) {
    this.htmlElement = this.elementRef.nativeElement;
    if (this._parentDrag) {
      this._parentDrag.addDragElement(this);
    }
  }

  /** Return the host component. */
  getHostComponent() {
    return this.host;
  }
}
