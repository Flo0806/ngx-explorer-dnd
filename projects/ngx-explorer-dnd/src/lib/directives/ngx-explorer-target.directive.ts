import {
  Directive,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Renderer2,
  SkipSelf,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { FileFolder } from '../core/file-folder';
import { DndService } from '../services/dnd.service';
import {
  EXPLORER_DND_CONTAINER,
  NgxExplorerContainerDirective,
} from './ngx-explorer-container.directive';

@Directive({
  selector: '[ngxExplorerDndTarget]',
  providers: [
    {
      provide: EXPLORER_DND_CONTAINER,
      useExisting: NgxExplorerTargetDirective,
    },
  ],
})
export class NgxExplorerTargetDirective implements OnInit, OnDestroy {
  private dragElementSubscription: Subscription = Subscription.EMPTY;
  private currentDragElement!: HTMLElement | null;

  @Input('dndTargetData') data!: any;

  constructor(
    private element: ElementRef,
    private renderer: Renderer2,
    private dndService: DndService,
    @Optional()
    @SkipSelf()
    @Inject(EXPLORER_DND_CONTAINER)
    private _parentDrag?: NgxExplorerContainerDirective,
    @Optional()
    private host?: FileFolder
  ) {}

  ngOnInit(): void {
    if (this._parentDrag) {
      this.dragElementSubscription = this.dndService
        .getDragElementSubject()
        .subscribe((element) => {
          this.currentDragElement = element;
        });
    }
  }

  ngOnDestroy(): void {
    this.dragElementSubscription.unsubscribe();
  }

  @HostListener('mouseenter', ['$event'])
  onMouseEnter(ev: any) {
    if (!this.currentDragElement) {
      ev.preventDefault();
      return;
    }
    const htmlElement = this._parentDrag?.getTargetHandleFromHTMLElement(
      this.currentDragElement
    );
    if (htmlElement) {
      this.renderer.addClass(
        this.element.nativeElement,
        'dnd-target-highlight'
      );
    }

    this._parentDrag?.setCurrentTarget(this);
  }

  @HostListener('mouseleave', ['$event'])
  onMouseLeave(ev: any) {
    this.renderer.removeClass(
      this.element.nativeElement,
      'dnd-target-highlight'
    );
    this._parentDrag?.setCurrentTarget(null);
  }

  /** Return the host component. */
  getHostComponent() {
    return this.host;
  }
}
