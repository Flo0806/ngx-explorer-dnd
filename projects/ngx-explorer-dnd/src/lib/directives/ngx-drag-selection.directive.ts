import { DOCUMENT } from '@angular/common';
import {
  Directive,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  Output,
} from '@angular/core';
import {
  EXPLORER_DND_CONTAINER,
  NgxExplorerContainerDirective,
} from './ngx-explorer-container.directive';
import { extendStyles } from '../core/css-helper';
import { FileFolder } from '../core/file-folder';

@Directive({
  selector: '[ngxDragSelection]',
})
export class NgxDragSelectionDirective {
  /** The current x position of the selection div. */
  private startX: number = 0;

  /** The current y position of the selection div. */
  private startY: number = 0;

  /**
   * The initial x position of the selection div.
   * Will be used to handle negative x position.
   */
  private initialX: number = 0;

  /**
   * The initial y position of the selection div.
   * Will be used to handle negative y position.
   */
  private initialY: number = 0;

  /**
   * Will be used to set current selected elements to check has
   * the current selected elements changed to before.
   */
  private selectedElements: Set<number> = new Set<number>();

  /** The current x position from the fired event. */
  private currentX: number = 0;

  /** the current y position from the fired event. */
  private currentY: number = 0;

  /** The current calculated width of the selection div. */
  private currentWidth: number = 0;

  /** The current calculated height of the selection div. */
  private currentHeight: number = 0;

  /** Will be true if selection in progress. */
  private selectingInProgress: boolean = false;

  /** The selection border created by this directive. */
  private selectionDiv!: HTMLElement;

  /** Sets whether ngx-drag-selection can be used.  */
  @Input() selectionAllowed: boolean = true;

  /** Set a custom selection div `HTMLElement`. */
  @Input() selectionDivElement!: HTMLElement;

  /** Event emitted when the selected elements are changed. */
  @Output() selectedElementsChange: EventEmitter<{
    count: number;
    data: FileFolder[];
  }> = new EventEmitter();

  //#region Helper
  /** Checks if a registered element of type `ngx-explorer-item` inside the selection div rect. */
  checkIfElementInsideRect(
    rect: any,
    selectionBorder: { x: number; y: number; width: number; height: number }
  ) {
    if (
      ((selectionBorder.x >= rect.x &&
        selectionBorder.x <= rect.x + rect.width) ||
        (selectionBorder.x <= rect.x &&
          selectionBorder.x + selectionBorder.width >= rect.x)) &&
      ((selectionBorder.y >= rect.y &&
        selectionBorder.y <= rect.y + rect.height) ||
        (selectionBorder.y <= rect.y &&
          selectionBorder.y + selectionBorder.height >= rect.y))
    ) {
      return true;
    } else {
      return false;
    }
  }

  /** Checks whether the selected elements have changed.  */
  checkIfSelectedElementsChanged(items: number[]): boolean {
    let changed: boolean = false;

    for (let item of items) {
      if (!this.selectedElements.has(item)) {
        // data has changed...
        changed = true;
      }
    }

    if (!changed) {
      if (this.selectedElements.size !== items.length) changed = true;
    }

    if (changed)
      // Changed? So "reset" selectedElements
      this.selectedElements = new Set(items);

    return changed;
  }

  /** Creates the selection div into document.body. */
  createSelectionDiv() {
    if (this.selectionDivElement) {
      this.selectionDiv = this.selectionDivElement;

      extendStyles(this.selectionDiv.style, {
        display: 'none',
        position: 'fixed',
        top: '0',
        left: '0',
        width: '0px',
        height: '0px',
      });
    } else {
      this.selectionDiv = document.createElement('div');

      extendStyles(this.selectionDiv.style, {
        display: 'none',
        position: 'fixed',
        opacity: '0.5',
        top: '0',
        left: '0',
        'border-style': 'solid',
        'border-radius': '6px',
        'border-width': '0',
        'border-color': '#7a7afa',
        'background-color': '#add8e6',
        width: '0px',
        height: '0px',
      });
    }

    this._document.body.appendChild(this.selectionDiv);
  }

  /** On `mousemove` this will set the current position and width of the selection div. */
  setSelectionDivPosition(mouseX: number, mouseY: number) {
    this.currentX = mouseX;
    this.currentY = mouseY;
    this.currentWidth = this.currentX - this.startX;
    this.currentHeight = this.currentY - this.startY;
    if (this.initialX >= this.currentX) {
      this.currentWidth = this.initialX - this.currentX;
      this.startX = this.currentX;
    }
    if (this.initialY >= this.currentY) {
      this.currentHeight = this.initialY - this.currentY;
      this.startY = this.currentY;
    }

    // div is not visible on start
    if (this.selectionDiv.style.display === 'none') {
      this.selectionDiv.style.display = 'unset';
    }
    extendStyles(this.selectionDiv.style, {
      left: this.startX + 'px',
      top: this.startY + 'px',
      width: this.currentWidth + 'px',
      height: this.currentHeight + 'px',
    });
  }
  //#endregion

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    @Inject(EXPLORER_DND_CONTAINER)
    private _parentDrag?: NgxExplorerContainerDirective
  ) {
    console.log(_parentDrag);
  }

  //#region HostListener
  @HostListener('document:mousedown', ['$event'])
  onMouseDown(ev: any) {
    if (!this.selectionAllowed) {
      ev.preventDefault();
      return;
    }

    if (!this.selectingInProgress) {
      this.startX = ev.x;
      this.startY = ev.y;
      this.initialX = this.startX;
      this.initialY = this.startY;

      this.selectingInProgress = true;
      this.createSelectionDiv();
      this.setSelectionDivPosition(this.startX, this.startY);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(ev: any) {
    if (!this.selectingInProgress || !this.selectionAllowed) {
      ev.preventDefault();
      return;
    }
    this.setSelectionDivPosition(ev.clientX, ev.clientY);

    if (this._parentDrag) {
      const data = this._parentDrag.getElementsInsideSelectionDiv(
        this.startX,
        this.startY,
        this.currentWidth,
        this.currentHeight
      );
      const result: FileFolder[] = [];
      if (data.length > 0) {
        for (let _data of data) {
          const fileFolderComponent = _data.getHostComponent();
          if (fileFolderComponent) {
            result.push(fileFolderComponent);
          }
        }
      }

      if (
        this.checkIfSelectedElementsChanged(
          result.map((data) => {
            return (data as any).__ngContext__;
          })
        )
      ) {
        this.selectedElementsChange.emit({
          count: result.length,
          data: result,
        });
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(ev: any) {
    if (this.selectingInProgress) {
      this.selectingInProgress = false;
      this._document.body.removeChild(this.selectionDiv);
    }
  }
  //#endregion
}
