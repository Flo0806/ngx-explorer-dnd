/** Enum of the type of the FileFolder class. */
export enum FileFolderType {
  File,
  Folder,
}

/** This class can be extended to a component. */
export abstract class FileFolder {
  public selected: boolean = false;
  public type: FileFolderType = FileFolderType.File;
  public position?: number;
  public id?: string;
}
