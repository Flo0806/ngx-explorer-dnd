import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DndService {
  private dragElementSubject: Subject<HTMLElement | null> =
    new Subject<HTMLElement | null>();

  constructor() {}

  getDragElementSubject() {
    return this.dragElementSubject.asObservable();
  }

  setCurrentDragElement(element: HTMLElement | null) {
    this.dragElementSubject.next(element);
  }
}
