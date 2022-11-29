import { Component, forwardRef } from '@angular/core';
import { FileFolder } from 'ngx-explorer-dnd';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.scss'],
  providers: [
    { provide: FileFolder, useExisting: forwardRef(() => FolderComponent) },
  ],
})
export class FolderComponent extends FileFolder {}
