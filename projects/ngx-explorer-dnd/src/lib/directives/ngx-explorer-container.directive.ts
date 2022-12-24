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
import {
  DragRowPosition,
  SameDragRow,
  Translate3DPosition,
} from '../core/utils';
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

  /** If sorting is enabled the new position of the dragged element is stored here to handle correct drop animation. */
  private positionDifference!: any;

  /** The start position of the mouse when beginning dragging. */
  private startPosition!: any;

  /** A unsorted list of all registered components */
  private unsortedItems: {
    htmlElement: HTMLElement;
    posData: { x: number; y: number; width: number; height: number };
  }[] = [];

  /** A sorted list of all registered components (sorted by position in the DOM) */
  private sortedItems: {
    htmlElement: HTMLElement;
    posData: { x: number; y: number; width: number; height: number };
  }[] = [];

  /** Event emitted when the drag progress was started. */
  @Output() dragInProgress: EventEmitter<boolean> = new EventEmitter<boolean>();

  /** Event emitted when the files are dropped with `mouseup`. */
  @Output() drop: EventEmitter<{
    item: any;
    target: any;
    optionalDragData?: any;
    oldIndex?: number;
    newIndex?: number;
  }> = new EventEmitter<{ item: any; target: any; optionalDragData?: any }>();

  /** Event emitted when a target under the mouse will change */
  @Output() targetChange: EventEmitter<{ target: any }> = new EventEmitter<{
    target: any;
  }>();

  /** Set optional data to the dragged element. */
  @Input() dragData!: any;

  /** Set a optional badge to the dragged element e.g. 2 if you drag multiple files. */
  @Input() badge!: string | null;

  /** Cancel move back animation after `mouseup` event */
  @Input() cancelAnimation: boolean = false;

  /** Can the file/folder components are sorted */
  @Input() sortingEnabled: boolean = false;

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

  /** Hide/show the dragged component */
  toggleVisibility(element: HTMLElement, visible: boolean) {
    extendStyles(element.style, {
      opacity: visible ? '0' : '',
      // position: visible ? 'fixed' : '',
      // left: visible ? '0' : '',
      // top: visible ? '-500em' : '',
    });
  }

  /** Creates a list with all registered components and their positions */
  createUnsortedList() {
    const unsortedItems: any[] = [];
    // All registered components
    for (let data of this._dragElements) {
      const clientRect = data.htmlElement.getBoundingClientRect();
      const posData = {
        x: clientRect.x,
        y: clientRect.y,
        width: clientRect.width,
        height: clientRect.height,
      };
      unsortedItems.push({ htmlElement: data.htmlElement, posData });
    }

    return unsortedItems;
  }

  /** Gets the registered items in the list, sorted by their position in the DOM. */
  getSortedItems(): any[] {
    return Array.from(this.createUnsortedList()).sort((a: any, b: any) => {
      const documentPosition = a.htmlElement.compareDocumentPosition(
        b.htmlElement
      );

      // `compareDocumentPosition` returns a bitmask so we have to use a bitwise operator.
      // https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
      // tslint:disable-next-line:no-bitwise
      return documentPosition & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  /** Check if the element has a translate3d style and returns the "real" values of x, y, width and height. */
  getCurrentPositionInclusiveTranslate3d(
    element: HTMLElement
  ): Translate3DPosition {
    const rect = element.getBoundingClientRect();
    let translateX = 0,
      translateY = 0;
    if (element.style.transform) {
      translateX =
        +element.style.transform
          .replace(/translate3d|px|\(|\)/gi, '')
          .split(',')[0] || 0;
      translateY =
        +element.style.transform
          .replace(/translate3d|px|\(|\)/gi, '')
          .split(',')[1] || 0;
    }

    return {
      startX: rect.x - translateX,
      startY: rect.y - translateY,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      halfWidthX: rect.x + rect.width / 2,
      halfHeightY: rect.y + rect.height / 2,
    };
  }

  /** Checks goes the new position of the element outside of the parent and set new row position */
  needToMoveUpOrDown(
    parentRect: DOMRect,
    indexOfElement: number,
    addDirection: number
  ): { transX: string; transY: string } | boolean {
    let transX: string = '0px',
      transY: string = '0px';
    let posChanged = false;

    const currentElement = this.sortedItems[indexOfElement];

    if (
      currentElement.posData.x + addDirection < parentRect.x &&
      indexOfElement > 0
    ) {
      transX =
        this.sortedItems[indexOfElement - 1].posData.x -
        this.sortedItems[indexOfElement].posData.x +
        'px';
      transY =
        this.sortedItems[indexOfElement - 1].posData.y -
        this.sortedItems[indexOfElement].posData.y +
        'px';
      posChanged = true;
    } else if (
      currentElement.posData.x + currentElement.posData.width + addDirection >
      parentRect.x + parentRect.width
    ) {
      transX =
        this.sortedItems[indexOfElement + 1].posData.x -
        this.sortedItems[indexOfElement].posData.x +
        'px';
      transY =
        this.sortedItems[indexOfElement + 1].posData.y -
        this.sortedItems[indexOfElement].posData.y +
        'px';
      posChanged = true;
    }

    return posChanged ? { transX, transY } : false;
  }

  /** Set the position of the dragged element */
  setCurrentPositionOfDraggedElement(
    draggedElement: HTMLElement | undefined,
    mousePosition: { x: number; y: number }
  ) {
    if (!draggedElement) return;

    const parentRect = draggedElement.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    // Intern helpers ------------------------------------------
    /** If the cursor moving in same row like the dragged element */
    const isInSameLine = (): SameDragRow => {
      const el = draggedElement.getBoundingClientRect();

      if (mousePosition.y >= el.y && mousePosition.y <= el.y + el.height)
        return {
          sameRow: true,
          dragRowPosition: DragRowPosition.SAME,
          sameLineAsMouse: DragRowPosition.UNDEFINED,
        };
      else if (mousePosition.y < el.y)
        return {
          sameRow: false,
          dragRowPosition: DragRowPosition.SMALLER,
          sameLineAsMouse: DragRowPosition.UNDEFINED,
        };
      else
        return {
          sameRow: false,
          dragRowPosition: DragRowPosition.GREATER,
          sameLineAsMouse: DragRowPosition.UNDEFINED,
        };
    };

    /** If the element is in the same line as the dragged element */
    const amIAtTheSameRow = (y: number, height?: number): SameDragRow => {
      const el = draggedElement.getBoundingClientRect();
      let mouseRowPosition: DragRowPosition = DragRowPosition.UNDEFINED;

      if (height) {
        if (mousePosition.y > y + height)
          mouseRowPosition = DragRowPosition.SMALLER;
        else if (mousePosition.y < y)
          mouseRowPosition = DragRowPosition.GREATER;
        else if (mousePosition.y >= y && mousePosition.y <= y + height)
          mouseRowPosition = DragRowPosition.SAME;
      }

      if (y === el.y) {
        return {
          sameRow: true,
          dragRowPosition: DragRowPosition.SAME,
          sameLineAsMouse: mouseRowPosition,
        };
      } else if (y > el.y) {
        return {
          sameRow: false,
          dragRowPosition: DragRowPosition.GREATER,
          sameLineAsMouse: mouseRowPosition,
        };
      } else {
        return {
          sameRow: false,
          dragRowPosition: DragRowPosition.SMALLER,
          sameLineAsMouse: mouseRowPosition,
        };
      }
    };

    // Mouse is right to new elmement
    const isRightToElement = (halfWidth: number): boolean => {
      if (mousePosition.x > halfWidth) return true;
      return false;
    };

    // Mouse is left to new element
    const isLeftToElement = (halfWidth: number): boolean => {
      if (mousePosition.x < halfWidth) return true;
      return false;
    };

    /** If the start position of the current element before `true`or after `false` the dragged element */
    const posIsBeforeDraggedElement = (x: number, y?: number) => {
      const el = draggedElement.getBoundingClientRect();

      if (y) {
        if (y < el.y) return true;
        if (y > el.y) return false;

        if (x < el.x && y === el.y) return true;
        return false;
      }
      if (x < el.x) return true;
      return false;
    };
    // ---------------------------------------------------------

    // Only if the mouse is inside the parent
    if (
      mousePosition.x >= parentRect.x &&
      mousePosition.x <= parentRect.x + parentRect?.width &&
      mousePosition.y >= parentRect.y &&
      mousePosition.y <= parentRect.y + parentRect?.height
    ) {
      const draggedRect = draggedElement.getBoundingClientRect();
      this.positionDifference = { ...this.position };

      let index = 0; // Index of the current unsorted item
      for (let element of this.sortedItems) {
        if (element.htmlElement !== draggedElement) {
          const rect = this.getCurrentPositionInclusiveTranslate3d(
            element.htmlElement
          );

          // if (
          //   element.htmlElement.getAttribute('ng-reflect-file-name') &&
          //   element.htmlElement.getAttribute('ng-reflect-file-name') ===
          //     'File 6'
          // ) {
          //console.log(rect.x, rect.startX, rect.startY);
          // console.log(
          //   mousePosition.x,
          //   rect.halfWidthX,
          //   rect.startX,
          //   mousePosition.y,
          //   rect.startY,
          //   rect.startY + rect.height
          // );
          // }

          let translateXValue = '0px',
            translateYValue = '0px';

          // Part: in same line
          // Are the current elements all in the same line as the dragged element, handle it here
          if (
            isInSameLine().sameRow &&
            amIAtTheSameRow(rect.y).sameRow &&
            isLeftToElement(rect.halfWidthX) &&
            posIsBeforeDraggedElement(rect.startX)
          ) {
            translateXValue = draggedRect.width + 'px';
          } else if (
            isInSameLine().sameRow &&
            amIAtTheSameRow(rect.y).sameRow &&
            isRightToElement(rect.halfWidthX) &&
            !posIsBeforeDraggedElement(rect.startX)
          ) {
            translateXValue = -draggedRect.width + 'px';
          }

          // Part: in other line
          // Are the current elements are greater or smaller than the dragged element, handle it here
          if (!isInSameLine().sameRow) {
            // Check all elements their position are smaller then the current
            if (isInSameLine().dragRowPosition == DragRowPosition.GREATER) {
              // Mouse goes under the dragged element; all elements they are greater as dragged element, but smaller/same as mouse will be handled here
              if (
                (amIAtTheSameRow(rect.y).dragRowPosition ===
                  DragRowPosition.GREATER ||
                  amIAtTheSameRow(rect.y).dragRowPosition ===
                    DragRowPosition.SAME) &&
                (amIAtTheSameRow(rect.y, rect.height).sameLineAsMouse ===
                  DragRowPosition.SAME ||
                  amIAtTheSameRow(rect.y, rect.height).sameLineAsMouse ===
                    DragRowPosition.SMALLER) &&
                !posIsBeforeDraggedElement(rect.startX, rect.startY)
              ) {
                if (
                  isRightToElement(rect.halfWidthX) ||
                  amIAtTheSameRow(rect.y).dragRowPosition ==
                    DragRowPosition.SAME ||
                  (amIAtTheSameRow(rect.y).dragRowPosition ==
                    DragRowPosition.GREATER &&
                    amIAtTheSameRow(rect.y, rect.height).sameLineAsMouse !==
                      DragRowPosition.SAME)
                ) {
                  translateXValue = -draggedRect.width + 'px';
                }
              }
            } else if (
              isInSameLine().dragRowPosition == DragRowPosition.SMALLER
            ) {
              if (
                (amIAtTheSameRow(rect.y).dragRowPosition ===
                  DragRowPosition.SMALLER ||
                  amIAtTheSameRow(rect.y).dragRowPosition ===
                    DragRowPosition.SAME) &&
                (amIAtTheSameRow(rect.y, rect.height).sameLineAsMouse ===
                  DragRowPosition.SAME ||
                  amIAtTheSameRow(rect.y, rect.height).sameLineAsMouse ===
                    DragRowPosition.GREATER) &&
                posIsBeforeDraggedElement(rect.startX, rect.startY)
              ) {
                if (
                  isLeftToElement(rect.halfWidthX) ||
                  amIAtTheSameRow(rect.y).dragRowPosition ==
                    DragRowPosition.SAME ||
                  (amIAtTheSameRow(rect.y).dragRowPosition ==
                    DragRowPosition.SMALLER &&
                    amIAtTheSameRow(rect.y, rect.height).sameLineAsMouse !==
                      DragRowPosition.SAME)
                ) {
                  translateXValue = draggedRect.width + 'px';
                }
              }
            }
          }

          // Check goes any element outside the parent. So change it's row position
          const checkNeedToMoveUpOrDown = this.needToMoveUpOrDown(
            parentRect,
            index,
            +translateXValue.replace('px', '')
          );
          if (checkNeedToMoveUpOrDown) {
            translateXValue = (<{ transX: string; transY: string }>(
              checkNeedToMoveUpOrDown
            )).transX;
            translateYValue = (<{ transX: string; transY: string }>(
              checkNeedToMoveUpOrDown
            )).transY;
          }

          extendStyles(element.htmlElement.style, {
            transform: `translate3d(${translateXValue},${translateYValue},0)`,
          });
        }

        index++;
      }
    }
  }

  /** Removes the transform3d positions from all elements */
  resetPositions(draggedElement: HTMLElement | undefined) {
    if (!draggedElement) return;

    for (let element of this.unsortedItems) {
      if (element.htmlElement !== draggedElement) {
        extendStyles(element.htmlElement.style, {
          transform: '',
        });
      }
    }
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

  /** Get the current index of the dragged element in the unsorted list */
  getCurrentIndexPosition(
    lastMouseX: number,
    lastMouseY: number,
    draggedElement: HTMLElement
  ): { x: number; y: number; oldIndex: number; newIndex: number } | undefined {
    const parentRect = draggedElement.parentElement?.getBoundingClientRect();
    let currentPosition = undefined;
    if (parentRect) {
      let newIndex = 0,
        oldIndex = 0;
      for (let elIndex = 0; elIndex < this.sortedItems.length; elIndex++) {
        if (this.sortedItems[elIndex].htmlElement === draggedElement) {
          oldIndex = elIndex;
          break;
        }
      }

      for (let el of this.sortedItems) {
        if (el.htmlElement !== draggedElement) {
          // Mouse has position of Object
          if (
            lastMouseX >= el.posData.x &&
            lastMouseX <= el.posData.x + el.posData.width &&
            lastMouseY >= el.posData.y &&
            lastMouseY <= el.posData.y + el.posData.height
          ) {
            currentPosition = {
              x: el.posData.x,
              y: el.posData.y,
              oldIndex,
              newIndex,
            };
            break;
          }
        }
        newIndex++;
      }
    }

    return currentPosition;
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

    // List of the current registered elements
    if (this.sortingEnabled) {
      this.unsortedItems = this.createUnsortedList();
      this.sortedItems = this.getSortedItems();
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

        const htmlElement = this._currentDragElement?.htmlElement;
        if (htmlElement) this.toggleVisibility(htmlElement, true);
      }

      if (!this.canMove) return;
      if (this.sortingEnabled) {
        this.setCurrentPositionOfDraggedElement(
          this._currentDragElement?.htmlElement,
          { x: event.x, y: event.y }
        );
      }

      this.setPreviewElementPosition(event.x, event.y);
    }

    event.stopPropagation();
    event.preventDefault();
  };

  private onMouseUp = (event: any) => {
    this.dragStarted = false;
    this.canMove = false;
    let indexData: any;

    if (this.previewElement) {
      if (this._currentDragElement && this.sortingEnabled) {
        indexData = this.getCurrentIndexPosition(
          event.x,
          event.y,
          this._currentDragElement?.htmlElement
        );

        this.positionDifference = { left: indexData?.x, top: indexData?.y };
      }

      this.previewElement.style.transition = '0.2s ease-in-out';

      let posX =
        (+this.previewElement.style.left.replace('px', '').trim() -
          (this.positionDifference
            ? this.positionDifference.left
            : this.position.left)) *
        -1;
      let posY =
        (+this.previewElement.style.top.replace('px', '').trim() -
          (this.positionDifference
            ? this.positionDifference.top
            : this.position.top)) *
        -1;

      this.previewElement.style.transform =
        'translate(' + posX + 'px, ' + posY + 'px)';

      event.preventDefault();
      event.stopPropagation();

      setTimeout(
        () => {
          this.drop.emit({
            item: this._currentDragElement?.data,
            target: this._currentTargetElement?.data,
            optionalDragData: this.dragData,
            oldIndex: indexData ? indexData.oldIndex : null,
            newIndex: indexData ? indexData.newIndex : null,
          });

          // Clear positionDifference
          this.positionDifference = null;

          if (this.previewElement)
            this._document.body.removeChild(this.previewElement);
          this.previewElement = null;

          const htmlElement = this._currentDragElement?.htmlElement;

          if (htmlElement) {
            this.toggleVisibility(htmlElement, false);
          }

          this.resetPositions(this._currentDragElement?.htmlElement);

          this.dndService.setCurrentDragElement(null);
          this._currentDragElement = null;
          this._currentTargetElement = null;
        },
        this.cancelAnimation ? 0 : 201
      );

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
    this.targetChange.emit({ target: element?.getHostComponent() });
  }
  //#endregion
}
