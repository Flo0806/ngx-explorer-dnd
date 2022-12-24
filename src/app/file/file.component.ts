import { Component, forwardRef, Input } from '@angular/core';
import { FileFolder } from 'ngx-explorer-dnd';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss'],
  providers: [
    { provide: FileFolder, useExisting: forwardRef(() => FileComponent) },
  ],
})
export class FileComponent extends FileFolder {
  @Input() fileName: string = '';
}
