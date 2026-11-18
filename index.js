/**
 * @format
 */

import {AppRegistry, Image} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {PluginManager} from 'sn-plugin-lib';
import {BUTTON_DOC, BUTTON_NOTE} from './src/buttons';

const icon = Image.resolveAssetSource(require('./assets/icon.png')).uri;

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

// Same toolbar button in both apps, separate ids so App knows where it was opened.
PluginManager.registerButton(1, ['NOTE'], {
  id: BUTTON_NOTE,
  name: 'Calculator',
  icon,
  showType: 1,
});

PluginManager.registerButton(1, ['DOC'], {
  id: BUTTON_DOC,
  name: 'Calculator',
  icon,
  showType: 1,
});
