# NGX Explorer DnD

## _Drag & Drop in Angular like in a desktop explorer!_

- Select with mouse (selection rect)
- Drag & Drop single or multiple files and folders
- ✨Magic ✨

## Getting Started

### Installation

Install the ngx-explorer-dnd package from **npm**

```
npm install ngx-explorer-dnd --save
```

### Usage

##### HTML Part

Add the `ngxExplorerDndContainer` directive to your container component. If you wanna use the selection rect, too add it with `ngxDragSelection`. Add `ngxExplorerDndElement` to the components to drag, so the file and folders as example.

```
<div
  class="outer-container"
  ngxExplorerDndContainer
  (dragInProgress)="dragInProgress($event)"
  (selectedElementsChange)="selectedElementsChange($event)"
  [selectionAllowed]="!isDragInProgress"
  (drop)="drop($event)"
  ngxDragSelection
>
  <app-file ngxExplorerDndElement *ngFor="let item of files"> </app-file>
  <app-folder ngxExplorerDndElement *ngFor="let item of files"></app-folder>
</div>
```

##### Code Behind

Simple we set a `isDragInProgress` boolean. So we don't wanna see the selection rect if we drag some elements. And if we use the selection rect and any elements are under the rect we wanna select it.

```
export class AppComponent {
  directories = ['Folder 1', 'Folder 2', 'Folder 3', 'Folder 4'];
  files = ['File 1', 'File 2', 'File 3', 'File 4'];

  isDragInProgress: boolean = false;

  @ViewChildren(FileFolder)
  fileFolderComponents!: QueryList<FileFolder>;

  constructor() { }

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
  }
}
```

##### The File and Folder Components

If we add the optional FileFolder extension to our components we have access to properties like **selected**, **type**, **position?**, **id?**.

```
@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss'],
  providers: [
    { provide: FileFolder, useExisting: forwardRef(() => FileComponent) },
  ],
})
export class FileComponent extends FileFolder {}
```

##### Optional Target Component

You can set the `ngxExplorerDndTarget` directive to a folder as example. So if you drag elements into this folder component the `drop event` will have a target property which includes the optional data you give them.

## API

##### ngxExplorerDndContainer

The highest container of all draggable components.

##### ngxExplorerDndContainer

The highest container of all draggable components.

##### ngxExplorerDndElement

A draggable component. Can be a **file** and a **folder**

##### ngxExplorerDndTarget

A target for the `ngxExplorerDndElement` components. It self can be a `ngxExplorerDndElement`, too.

##### ngxDragSelection

Best set this directive to the highest container; so the `ngxExplorerDndContainer`. Inside this container the selection rect will be show.

### Properties and Events

Here are the properties and Events of the directives we have:

##### Properties

#

| Directive               |      Property       |         Type          |                    Description                     |
| ----------------------- | :-----------------: | :-------------------: | :------------------------------------------------: |
| ngxExplorerDndContainer |      dragData       |          any          |    Add any optional data for the `drop` event.     |
| ngxExplorerDndContainer |        badge        | string _or_ undefined | If set it shows a custom badge inside drag preview |
| ngxDragSelection        |  selectionAllowed   |        boolean        |      Set if the selection rect can be showed       |
| ngxDragSelection        | selectionDivElement | HTMLElement _or_ null |   Set a custom selection rect with custom styles   |
| ngxExplorerDndElement   |   dndElementData    |          any          |       Any optional data for the `drop` event       |
| ngxExplorerDndTarget    |    dndTargetData    |          any          |       Any optional data for the `drop` event       |

##### Events

#

| Directive               |        Property        |                               Type                               |                    Description                     |
| ----------------------- | :--------------------: | :--------------------------------------------------------------: | :------------------------------------------------: |
| ngxExplorerDndContainer |     dragInProgress     |                      EventEmitter<boolean>                       |      Emitted when drag progress was started.       |
| ngxExplorerDndContainer |          drop          | EventEmitter<{ item: any, target: any, oprionalDragData?: any }> | Occurs on `ngxExplorerDndElement` will be dropped. |
| ngxDragSelection        | selectedElementsChange |      EventEmitter<{ count: number, data: `FileFolder[]` }>       |     Occurs when selected Elements are changed.     |

## Example

A example says more than 1000 words. So play around with [Stackblitz][df1]!

## Authors

- Florian Heuberger _(Flo0806)_

## License

[MIT License][mit] © Andrea SonnY

## Last But Not Least

If you like the project so rate it! 😎

[df1]: http://daringfireball.net/projects/markdown/
[mit]: https://andreasonny.mit-license.org/2019
