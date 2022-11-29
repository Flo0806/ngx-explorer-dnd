import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FileComponent } from './file/file.component';
import { FolderComponent } from './folder/folder.component';

import { NgxExplorerDndModule } from 'ngx-explorer-dnd';

@NgModule({
  declarations: [AppComponent, FileComponent, FolderComponent],
  imports: [BrowserModule, AppRoutingModule, NgxExplorerDndModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
