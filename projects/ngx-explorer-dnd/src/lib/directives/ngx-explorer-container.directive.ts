import { DOCUMENT } from '@angular/common';
import {
  Directive,
  EventEmitter,
  Inject,
  InjectionToken,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { extendStyles } from '../core/css-helper';
import { DndService } from '../services/dnd.service';
import { NgxExplorerItemDirective } from './ngx-explorer-item.directive';
import { NgxExplorerTargetDirective } from './ngx-explorer-target.directive';

export const EXPLORER_DND_CONTAINER =
  new InjectionToken<NgxExplorerContainerDirective>('EXPLORER_DND_CONTAINER');

@Directive({
  selector: '[ngxExplorerDndContainer]',
  providers: [
    {
      provide: EXPLORER_DND_CONTAINER,
      useExisting: NgxExplorerContainerDirective,
    },
  ],
})
export class NgxExplorerContainerDirective<T = any>
  implements OnInit, OnDestroy
{
  /** The current dragged element from type `NgxExplorerItemDirective`. */
  private _currentDragElement!: NgxExplorerItemDirective | null;

  /** The current target element from type `NgxExplorerTargetDirective`. */
  private _currentTargetElement!: NgxExplorerTargetDirective | null;

  /** The registered elements as array from type `NgxExplorerItemDirective`. */
  private _dragElements: NgxExplorerItemDirective[] = [];

  /** The generated deep clone preview element. */
  private previewElement!: HTMLElement | null;

  /** If drag startet. */
  private dragStarted = false;

  /** Check if the current element can be moved with the intern `isMinRangeMoved` method. */
  private canMove = false;

  /** The position of the dragged element. */
  private position!: any;

  /** The start position of the mouse when beginning dragging. */
  private startPosition!: any;

  /** Event emitted when the drag progress was started. */
  @Output() dragInProgress: EventEmitter<boolean> = new EventEmitter<boolean>();

  /** Event emitted when the files are dropped with `mouseup`. */
  @Output() drop: EventEmitter<{
    item: any;
    target: any;
    optionalDragData?: any;
  }> = new EventEmitter<{ item: any; target: any; optionalDragData?: any }>();

  /** Set optional data to the dragged element. */
  @Input() dragData!: any;

  /** Set a optional badge to the dragged element e.g. 2 if you drag multiple files. */
  @Input() badge!: string | null;

  //#region Helper
  /** Deep clone the current element for a preview element. */
  deepCloneNode(node: HTMLElement, badge?: string): HTMLElement {
    const clone = node.cloneNode(true) as HTMLElement;
    if (badge) {
      const badgeElement = document.createElement('div');
      badgeElement.innerHTML = badge;
      extendStyles(badgeElement.style, {
        margin: '0',
        position: 'absolute',
        top: '0',
        right: '0',
        'text-align': 'center',
        'border-style': 'solid',
        'border-radius': '50%',
        'border-width': '0',
        'background-color': 'red',
        width: '20px',
        height: '20px',
        color: 'white',
      });
      clone.appendChild(badgeElement);
    }
    const descendantsWithId = clone.querySelectorAll('[id]');

    // Remove the `id` to avoid having multiple elements with the same id on the page.
    clone.removeAttribute('id');

    for (let i = 0; i < descendantsWithId.length; i++) {
      descendantsWithId[i].removeAttribute('id');
    }

    return clone;
  }

  /** Set the position of the preview element */
  setPreviewElementPosition(posX: number, posY: number) {
    if (this.previewElement) {
      if (this.previewElement.style.display === 'none') {
        this.previewElement.style.display = 'unset';
      }

      this.previewElement.style.left =
        posX - this.previewElement.clientWidth / 2 + 'px';
      this.previewElement.style.top =
        posY - this.previewElement.clientHeight / 2 + 'px';
    }
  }

  /** Dragging start if the pressed mouse moved the min range. */
  isMinRangeMoved(posX: number, posY: number): boolean {
    // Standard is 8px
    if (this.previewElement) {
      if (
        this.startPosition.left - 7 > posX ||
        this.startPosition.left + 7 < posX ||
        this.startPosition.top - 7 > posY ||
        this.startPosition.top + 7 < posY
      ) {
        return true;
      }
    }
    return false;
  }

  /** Check if element is inside rect. */
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

  /** Get all elements of type `NgxExplorerItemDirective` from an event. */
  getTargetHandle(event: Event): NgxExplorerItemDirective | undefined {
    return this._dragElements.find((handle) => {
      return (
        event.target &&
        (event.target === handle.htmlElement ||
          handle.htmlElement.contains(event.target as Node))
      );
    });
  }

  /** Get all elements of type `NgxExplorerItemDirective` from a HTMLElement. */
  getTargetHandleFromHTMLElement(
    element: HTMLElement
  ): HTMLElement | undefined {
    return this._dragElements.find((handle) => {
      return (
        element === handle.htmlElement || element.contains(element as Node)
      );
    })?.htmlElement;
  }

  /** Returns a list of all elements of type `NgxExplorerItemDirective` they are inside a specific rect. */
  getElementsInsideSelectionDiv(
    x: number,
    y: number,
    width: number,
    height: number
  ): NgxExplorerItemDirective[] {
    const result: NgxExplorerItemDirective[] = [];

    this._dragElements.forEach((data) => {
      const rect = data.htmlElement.getBoundingClientRect();
      if (
        this.checkIfElementInsideRect(rect, {
          x,
          y,
          width,
          height,
        })
      ) {
        result.push(data);
      }
    });

    return result;
  }

  /** Initialize all event listener. */
  initAll(): this {
    // Use arrow functions to use "this" in onMouseDown (as example) or use .....bind(this)
    // We can use @HostListener instead.
    this._document.addEventListener('mousedown', this.onMouseDown.bind(this));
    this._document.addEventListener('mousemove', this.onMouseMove);
    this._document.addEventListener('mouseup', this.onMouseUp);

    return this;
  }

  /** Remove all event listener. */
  clearAll() {
    this._document.removeEventListener('mousedown', this.onMouseDown);
    this._document.removeEventListener('mousemove', this.onMouseMove);
    this._document.removeEventListener('mouseup', this.onMouseUp);
  }
  //#endregion

  constructor(
    private _ngZone: NgZone,
    @Inject(DOCUMENT) private _document: Document,
    private dndService: DndService
  ) {}

  ngOnInit(): void {
    this.initAll();
  }

  ngOnDestroy(): void {
    this.clearAll();
  }

  private onMouseDown(event: MouseEvent) {
    if (event.button !== 0) {
      event.preventDefault();
      return;
    }
    this.dragStarted = true;

    this._currentDragElement = this.getTargetHandle(event) || null;
    const htmlElement = this._currentDragElement?.htmlElement;

    if (htmlElement) {
      this.previewElement = this.deepCloneNode(
        htmlElement as HTMLElement,
        this.badge as string
      );
      this.position = {
        left: htmlElement.getBoundingClientRect().left,
        top: htmlElement.getBoundingClientRect().top,
      };
      this.startPosition = {
        left: event.x,
        top: event.y,
      };

      extendStyles(
        this.previewElement.style,
        {
          'pointer-events': 'none',
          margin: '0',
          position: 'fixed',
          top: '0',
          left: '0',
          'z-index': '1000',
          display: 'none',
        },
        new Set(['position'])
      );

      this._document.body.appendChild(this.previewElement);

      this.dndService.setCurrentDragElement(htmlElement);

      event.stopPropagation();
      event.preventDefault();

      this.dragInProgress.emit(true);
    }
  }

  private onMouseMove = (event: MouseEvent) => {
    if (this.dragStarted) {
      if (this.isMinRangeMoved(event.x, event.y)) {
        this.canMove = true;
      }

      if (!this.canMove) return;

      this.setPreviewElementPosition(event.x, event.y);
      event.stopPropagation();
      event.preventDefault();
    }
    event.stopPropagation();
    event.preventDefault();
  };

  private onMouseUp = (event: any) => {
    this.dragStarted = false;
    this.canMove = false;

    if (this.previewElement) {
      this.previewElement.style.transition = '0.2s ease-in-out';

      let posX =
        (+this.previewElement.style.left.replace('px', '').trim() -
          this.position.left) *
        -1;
      let posY =
        (+this.previewElement.style.top.replace('px', '').trim() -
          this.position.top) *
        -1;

      this.previewElement.style.transform =
        'translate(' + posX + 'px, ' + posY + 'px)';

      this.drop.emit({
        item: this._currentDragElement?.data,
        target: this._currentTargetElement?.data,
        optionalDragData: this.dragData,
      });

      this.dndService.setCurrentDragElement(null);
      this._currentDragElement = null;
      this._currentTargetElement = null;

      event.preventDefault();
      event.stopPropagation();
      setTimeout(() => {
        if (this.previewElement)
          this._document.body.removeChild(this.previewElement);
        this.previewElement = null;
      }, 201);
      this.dragInProgress.emit(false);
    }
  };

  //#region Public Voids
  /** `ngx-explorer-item` will call this method to register itself. */
  addDragElement(element: NgxExplorerItemDirective) {
    this._dragElements.push(element);
  }

  /** `ngx-explorer-target` will call this method to register itself as target on mouseenter */
  setCurrentTarget(element: NgxExplorerTargetDirective | null) {
    this._currentTargetElement = element;
  }
  //#endregion
}
