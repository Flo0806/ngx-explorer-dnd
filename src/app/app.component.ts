import { Component, QueryList, ViewChildren } from '@angular/core';
import { FileFolder, moveItemInArray } from 'ngx-explorer-dnd';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  directories = ['Folder 1', 'Folder 2', 'Folder 3', 'Folder 4'];
  files: any[] = []; // ['File 1', 'File 2', 'File 3', 'File 4'];

  myElement!: HTMLElement;

  isDragInProgress: boolean = false;

  @ViewChildren(FileFolder)
  fileFolderComponents!: QueryList<FileFolder>;

  constructor() {
    // Example to set a custom selection div HTMLElement
    // this.myElement = document.createElement('div');
    // this.myElement.style.position = 'absolute';
    // this.myElement.style.width = '100px';
    // this.myElement.style.height = '100px';
    // this.myElement.style.backgroundColor = 'green';

    for (let i = 1; i < 30; i++) {
      this.files.push('File ' + i.toString());
    }
  }

  dragInProgress(event: boolean) {
    this.isDragInProgress = event;
  }

  selectedElementsChange(event: { count: number; data: FileFolder[] }) {
    for (let _data of this.fileFolderComponents) {
      _data.selected = false;
    }

    for (let _data of event.data) {
      _data.selected = true;
    }
  }

  drop(event: any) {
    console.log(event);
    if (event.oldIndex !== null) {
      moveItemInArray(this.files, event.oldIndex, event.newIndex);
    }
  }
}
