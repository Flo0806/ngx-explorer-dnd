import { Component, QueryList, ViewChildren } from '@angular/core';
import { FileFolder } from 'ngx-explorer-dnd';
import { FileFolderType } from 'projects/ngx-explorer-dnd/src/public-api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  directories = ['Folder 1', 'Folder 2', 'Folder 3', 'Folder 4'];
  files = ['File 1', 'File 2', 'File 3', 'File 4'];

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
}
