import { window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, workspace, scm } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

type generateType = 'basic-comp' | 'redux-comp' | 'stateless';

export function activate(context: ExtensionContext) {

  function initGenerateComponentFile(selectedFolder, type: generateType) {
    if (selectedFolder) {
      const isDir = fs.statSync(selectedFolder.path).isDirectory();
      if (isDir) {
        const pathObj = path.parse(selectedFolder.path);
        new GenerateComponentFile(selectedFolder.path).generate(type);
      } else {
        window.showErrorMessage('Generate React Compnent failed: target file must be a directory');
      }
    } else {
      const tempPath = path.join(workspace.rootPath, 'ReactComponent');
      fs.mkdirSync(tempPath);
      new GenerateComponentFile(tempPath).generate(type);
    }
  }

  console.log('Congratulations, your extension "generate react component" is now active!');
  const basicComponent = commands.registerCommand('grc.basicComponent', selectedFolder => {
    initGenerateComponentFile(selectedFolder, 'basic-comp');
  });

  const reduxComponent = commands.registerCommand('grc.reduxComponent', selectedFolder => {
    initGenerateComponentFile(selectedFolder, 'redux-comp');
  });

  const stateLessComponent = commands.registerCommand('grc.stateLessComponent', selectedFolder => {
    initGenerateComponentFile(selectedFolder, 'stateless');
  });

  // Add to a list of disposables which are disposed when this extension is deactivated.
  context.subscriptions.push(basicComponent);
  context.subscriptions.push(reduxComponent);
  context.subscriptions.push(stateLessComponent);
}

export class GenerateComponentFile {
  private pathObj: path.ParsedPath;
  private tmplFolder = path.join(__dirname, './templates');
  private compName: string = '';
  private targetPath: string = '';
  private type: string = '';

  constructor(targetPath: string) {
    try {
      this.pathObj = path.parse(targetPath);
      this.compName = this.pathObj.name;
      this.targetPath = targetPath;
    } catch (error) {
      this.log('error')('parse folder path error');
    }

  }

  log(type: 'success'|'warning'|'error') {
    return function (msg: string = '') {
      console.log(msg);
      switch (type) {
        case 'success':
          window.showInformationMessage(`Generate React Component Success: ${msg}`);
          break;
        case 'warning':
          window.showWarningMessage(`Generate React Component Warning: ${msg}`);
          break;
        case 'error':
          window.showErrorMessage(`Generate React Component Failed: ${msg}`);
          break;
      }
    }
  }

  /**
   * replace placeholder and return new file data
   * @param tmplFile 
   */
  _replace(tmplFile): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(tmplFile, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.replace(/\${\w+}/igm, this.compName));
        }
      });
    });
  }

  /**
   * write new file
   * @param fileName 
   * @param data 
   */
  _writeFile = (fileName: string, data: string | Buffer) => {
    fs.writeFile(path.join(this.targetPath, fileName), data, err => {
      if (err) {
        console.log(err);
        this.log('error')(err.message);
      }
    });
  }

  _mapTmplFile(tmplFolder: string) {
    fs.readdir(this.tmplFolder, (err, files) => {
      if (err) {
        this.log('error')(err.toString());
        return;
      }
      files.forEach(async file => {
        const tempPath = path.join(tmplFolder, file);
        if (file.indexOf(this.type) !== -1) {
          try {
            const replaceResult = await this._replace(tempPath);
            this._writeFile('index.tsx', replaceResult);
          } catch (error) {
            this.log('error')(error);
          }
        }
      });
    });
  }

  generate(type: generateType) {
    this.type = type;
    this._mapTmplFile(this.tmplFolder);
    this._writeFile('index.scss', '');
  }
}